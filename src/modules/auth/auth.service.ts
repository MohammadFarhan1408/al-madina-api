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
import { signAccessToken, refreshTokenExpiry } from '../../utils/jwt';
import { logger } from '../../config/logger';
import { queueEmail } from '../../jobs/queues/email.queue';
import { queueNotification } from '../../jobs/queues/notification.queue';
import { buildResetUrl } from '../../emails/templates';
import type { IUser } from '../../database/models';
import type { UserRole, UserTier } from '../../constants/business';

/**
 * Issue an access token plus a fresh opaque refresh token (stored hashed).
 * Centralised so sign-up, sign-in, and refresh all produce identical pairs.
 */
async function issueTokens(user: IUser): Promise<TokenPair> {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    tier: user.tier as UserTier,
    role: user.role as UserRole,
  });

  const { token: refreshToken, hash } = generateOpaqueToken();
  await authRepository.createRefreshToken(user._id, hash, refreshTokenExpiry());

  return { accessToken, refreshToken };
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

  /** Authenticate by email/password (§ POST /auth/sign-in). */
  async signIn(input: SignInInput): Promise<AuthResult> {
    const user = await authRepository.findByEmailWithPassword(input.email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }
    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated', ERROR_CODES.ACCOUNT_INACTIVE);
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
    }

    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  /** Revoke a refresh token (§ POST /auth/sign-out). Idempotent. */
  async signOut(refreshToken: string): Promise<void> {
    await authRepository.revokeRefreshToken(hashToken(refreshToken));
  },

  /**
   * Rotate a refresh token: validate it, revoke it, and issue a new pair
   * (§12 Rotation). Reuse of a revoked/expired token is rejected.
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);
    const stored = await authRepository.findRefreshToken(tokenHash);

    if (!stored) {
      throw ApiError.unauthorized('Invalid refresh token', ERROR_CODES.TOKEN_INVALID);
    }
    if (stored.revokedAt) {
      throw ApiError.unauthorized('Refresh token has been revoked', ERROR_CODES.TOKEN_REVOKED);
    }
    if (stored.expiresAt.getTime() < Date.now()) {
      throw ApiError.unauthorized('Refresh token has expired', ERROR_CODES.TOKEN_EXPIRED);
    }

    const user = await authRepository.findById(stored.userId.toString());
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Account no longer active', ERROR_CODES.ACCOUNT_INACTIVE);
    }

    // Rotate: revoke the presented token before issuing a replacement.
    await authRepository.revokeRefreshToken(tokenHash);
    return issueTokens(user);
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
  },
};
