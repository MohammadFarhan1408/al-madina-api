import { authRepository } from './auth.repository';
import { toPublicUser, type AuthResult, type TokenPair, type PublicUser } from './auth.types';
import type {
  SignUpInput,
  SignInInput,
  ResetPasswordInput,
} from './auth.schema';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { PASSWORD_RESET_TTL_MS } from '../../constants/business';
import {
  hashPassword,
  comparePassword,
  generateOpaqueToken,
  hashToken,
} from '../../utils/hash';
import { randomUUID } from 'node:crypto';
import { signAccessToken, refreshTokenExpiry, parseDurationMs } from '../../utils/jwt';
import { config } from '../../config';
import { logger } from '../../config/logger';
import { queueEmail } from '../../jobs/queues/email.queue';
import { queueNotification } from '../../jobs/queues/notification.queue';
import { buildResetUrl } from '../../emails/templates';
import type { IUser } from '../../database/models';
import type { UserRole, UserTier } from '../../constants/business';

/** Staff sessions are capped (config.jwt.adminSessionTtl); customers' are not. */
const isStaff = (role: string) => role === 'admin' || role === 'manager';

/** A rotated token that was spent this recently is treated as a race between two
 *  tabs/requests, not theft — so it doesn't trigger a family-wide revoke. */
const REUSE_GRACE_MS = 30_000;

/** Lockout: this many wrong passwords in a row locks the account for LOCK_MS. */
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;

/** Compared against when the email doesn't exist, so an unknown email takes as
 *  long as a wrong password and response time doesn't reveal which accounts exist. */
let dummyHash: Promise<string> | undefined;
const timingDummy = () => (dummyHash ??= hashPassword('timing-equaliser-not-a-real-password'));

/**
 * Issue an access token plus a fresh opaque refresh token (stored hashed).
 * Centralised so sign-up, sign-in, and refresh all produce identical pairs.
 * A rotation passes the previous token's session so the family and the
 * absolute staff cap carry over unchanged.
 */
async function issueTokens(
  user: IUser,
  session?: { familyId?: string; sessionExpiresAt?: Date },
): Promise<TokenPair> {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    tier: user.tier as UserTier,
    role: user.role as UserRole,
  });

  const sessionExpiresAt =
    session?.sessionExpiresAt ??
    (isStaff(user.role) ? new Date(Date.now() + parseDurationMs(config.jwt.adminSessionTtl)) : undefined);
  const sliding = refreshTokenExpiry();
  const refreshExpiresAt = sessionExpiresAt && sessionExpiresAt < sliding ? sessionExpiresAt : sliding;

  const { token: refreshToken, hash } = generateOpaqueToken();
  await authRepository.createRefreshToken(user._id, hash, refreshExpiresAt, {
    familyId: session?.familyId ?? randomUUID(),
    sessionExpiresAt,
  });

  return { accessToken, refreshToken, refreshExpiresAt };
}

export const authService = {
  /** Register a new account and return tokens (§ POST /auth/sign-up). */
  async signUp(input: SignUpInput): Promise<AuthResult> {
    if (await authRepository.emailExists(input.email)) {
      throw ApiError.conflict('Email is already registered', ERROR_CODES.EMAIL_TAKEN);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createUser({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
    });

    const tokens = await issueTokens(user);
    logger.info({ userId: user._id.toString() }, 'New user registered');

    // Welcome email + in-app notification (best-effort background jobs).
    void queueEmail({ type: 'welcome', to: user.email, name: user.fullName });
    void queueNotification({
      userId: user._id.toString(),
      kind: 'system',
      title: 'Welcome to Al Madina',
      body: 'Your account is ready. Explore our luxury Arabian ittars.',
    });

    return { user: toPublicUser(user), ...tokens };
  },

  /**
   * Authenticate by email/password (§ POST /auth/sign-in).
   * Order matters: lockout first, then the password, and only then whether the
   * account is active — so a deactivated or locked account is never revealed to
   * someone who doesn't know its password. Staff attempts are audited.
   */
  async signIn(input: SignInInput, meta: { ip?: string } = {}): Promise<AuthResult> {
    const user = await authRepository.findByEmailWithPassword(input.email);
    if (!user) {
      await comparePassword(input.password, await timingDummy());
      throw ApiError.unauthorized('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }
    const audit = (status: number) =>
      isStaff(user.role) ? authRepository.recordSignIn(user, meta.ip, status).catch(() => undefined) : undefined;

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      await audit(429);
      throw ApiError.tooManyRequests(
        `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        ERROR_CODES.ACCOUNT_LOCKED,
      );
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      const failures = await authRepository.recordFailedLogin(user._id);
      if (failures >= MAX_FAILED_LOGINS) {
        await authRepository.lockAccount(user._id, new Date(Date.now() + LOCK_MS));
        logger.warn({ userId: user._id.toString() }, 'Account locked after repeated failed sign-ins');
      }
      await audit(401);
      throw ApiError.unauthorized('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      await audit(403);
      throw ApiError.forbidden('Account is deactivated', ERROR_CODES.ACCOUNT_INACTIVE);
    }

    if (user.failedLoginCount || user.lockedUntil) await authRepository.clearFailedLogins(user._id);
    const tokens = await issueTokens(user);
    await audit(200);
    return { user: toPublicUser(user), ...tokens };
  },

  /** Revoke a refresh token (§ POST /auth/sign-out). Idempotent, and needs only
   *  the refresh token — so signing out still works after the access token expired. */
  async signOut(refreshToken: string): Promise<void> {
    await authRepository.revokeRefreshToken(hashToken(refreshToken));
  },

  /**
   * Rotate a refresh token (§12 Rotation): spend it atomically and issue a new
   * pair in the same family. Presenting a token that was already spent (outside
   * a short race window) means it was copied — the whole family is revoked so
   * neither the thief nor the victim keeps a live session.
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);
    const spent = await authRepository.consumeRefreshToken(tokenHash);

    if (!spent) {
      const stored = await authRepository.findRefreshToken(tokenHash);

      if (!stored) {
        throw ApiError.unauthorized('Invalid refresh token', ERROR_CODES.TOKEN_INVALID);
      }
      if (stored.revokedAt) {
        if (stored.familyId && Date.now() - stored.revokedAt.getTime() > REUSE_GRACE_MS) {
          await authRepository.revokeRefreshTokenFamily(stored.familyId);
          logger.warn(
            { userId: stored.userId.toString(), familyId: stored.familyId },
            'Refresh token reuse detected — session family revoked',
          );
        }
        throw ApiError.unauthorized('Refresh token has been revoked', ERROR_CODES.TOKEN_REVOKED);
      }
      throw ApiError.unauthorized('Refresh token has expired', ERROR_CODES.TOKEN_EXPIRED);
    }

    const user = await authRepository.findById(spent.userId.toString());
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Account no longer active', ERROR_CODES.ACCOUNT_INACTIVE);
    }

    return issueTokens(user, { familyId: spent.familyId, sessionExpiresAt: spent.sessionExpiresAt });
  },

  /** Return the current authenticated user (§ GET /auth/me). */
  async me(userId: string): Promise<PublicUser> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
    }
    return toPublicUser(user);
  },

  /**
   * Begin password reset. Always resolves the same way whether or not the email
   * exists, to avoid account enumeration (§12 Password Reset Flow).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      return; // Silently succeed — do not reveal account existence.
    }

    // Invalidate any prior reset tokens, then issue a fresh one.
    await authRepository.deletePasswordResetTokensForUser(user._id);
    const { token, hash } = generateOpaqueToken();
    await authRepository.createPasswordResetToken(
      user._id,
      hash,
      new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    );

    void queueEmail({ type: 'password-reset', to: user.email, resetUrl: buildResetUrl(token) });
    logger.info({ userId: user._id.toString() }, 'Password reset requested');
  },

  /** Complete password reset with a valid token (§ POST /auth/reset-password). */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = hashToken(input.token);
    const record = await authRepository.findPasswordResetToken(tokenHash);

    if (!record) {
      throw ApiError.badRequest('Invalid reset token', ERROR_CODES.TOKEN_INVALID);
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw ApiError.badRequest('Reset token has expired', ERROR_CODES.TOKEN_EXPIRED);
    }

    const passwordHash = await hashPassword(input.password);
    await authRepository.updatePassword(record.userId, passwordHash);
    // Single-use: remove all reset tokens for this user.
    await authRepository.deletePasswordResetTokensForUser(record.userId);
    // A refresh token stolen before the reset must not outlive it.
    await authRepository.revokeAllRefreshTokensForUser(record.userId);
  },
};
