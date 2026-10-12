import { Types } from 'mongoose';
import {
  User,
  AuditLog,
  RefreshToken,
  PasswordResetToken,
  UserPreference,
  type IUser,
  type IRefreshToken,
} from '../../database/models';

/**
 * Data-access layer for authentication. All Mongo queries live here so the
 * service layer stays persistence-agnostic and testable.
 */
export const authRepository = {
  findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).exec();
  },

  /** Includes the normally-hidden passwordHash and lockout state for credential checks. */
  findByEmailWithPassword(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() })
      .select('+passwordHash +failedLoginCount +lockedUntil')
      .exec();
  },

  // ─── Brute-force lockout ───────────────────────────────────────────────────

  /** Count a failed sign-in atomically; returns the new count. */
  async recordFailedLogin(userId: Types.ObjectId): Promise<number> {
    const user = await User.findByIdAndUpdate(userId, { $inc: { failedLoginCount: 1 } }, { new: true })
      .select('+failedLoginCount')
      .lean<{ failedLoginCount: number }>()
      .exec();
    return user?.failedLoginCount ?? 0;
  },

  async lockAccount(userId: Types.ObjectId, until: Date): Promise<void> {
    await User.updateOne({ _id: userId }, { $set: { lockedUntil: until, failedLoginCount: 0 } }).exec();
  },

  async clearFailedLogins(userId: Types.ObjectId): Promise<void> {
    await User.updateOne({ _id: userId }, { $set: { failedLoginCount: 0, lockedUntil: null } }).exec();
  },

  /** Staff sign-in attempts go into the audit trail (the admin Activity page). */
  async recordSignIn(user: IUser, ip: string | undefined, statusCode: number): Promise<void> {
    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      action: 'POST /v1/auth/sign-in',
      method: 'POST',
      path: '/v1/auth/sign-in',
      ip,
      statusCode,
    });
  },

  findById(id: string): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return User.findById(id).exec();
  },

  emailExists(email: string): Promise<boolean> {
    return User.exists({ email: email.toLowerCase() }).then((doc) => Boolean(doc));
  },

  async createUser(data: {
    fullName: string;
    email: string;
    passwordHash: string;
  }): Promise<IUser> {
    const user = await User.create(data);
    // Create default preferences alongside the account (§9 UserPreference).
    await UserPreference.create({ userId: user._id });
    return user;
  },

  async updatePassword(userId: Types.ObjectId, passwordHash: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $set: { passwordHash } }).exec();
  },

  // ─── Refresh tokens ────────────────────────────────────────────────────────

  createRefreshToken(
    userId: Types.ObjectId,
    tokenHash: string,
    expiresAt: Date,
    session: { familyId: string; sessionExpiresAt?: Date },
  ): Promise<IRefreshToken> {
    return RefreshToken.create({ userId, token: tokenHash, expiresAt, ...session });
  },

  /** Spend a live refresh token in one atomic step, so two concurrent refreshes
   *  with the same token can't both succeed. Returns the token as it was before. */
  consumeRefreshToken(tokenHash: string): Promise<IRefreshToken | null> {
    return RefreshToken.findOneAndUpdate(
      { token: tokenHash, revokedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { revokedAt: new Date() } },
    ).exec();
  },

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    await RefreshToken.updateMany({ familyId, revokedAt: null }, { $set: { revokedAt: new Date() } }).exec();
  },

  findRefreshToken(tokenHash: string): Promise<IRefreshToken | null> {
    return RefreshToken.findOne({ token: tokenHash }).exec();
  },

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await RefreshToken.updateOne(
      { token: tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();
  },

  /** Revoke every live refresh token for a user — used on password reset so a
   * token stolen before the reset doesn't outlive it. */
  async revokeAllRefreshTokensForUser(userId: Types.ObjectId): Promise<void> {
    await RefreshToken.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();
  },

  // ─── Password reset tokens ─────────────────────────────────────────────────

  createPasswordResetToken(userId: Types.ObjectId, tokenHash: string, expiresAt: Date) {
    return PasswordResetToken.create({ userId, token: tokenHash, expiresAt });
  },

  findPasswordResetToken(tokenHash: string) {
    return PasswordResetToken.findOne({ token: tokenHash }).exec();
  },

  async deletePasswordResetTokensForUser(userId: Types.ObjectId): Promise<void> {
    await PasswordResetToken.deleteMany({ userId }).exec();
  },
};
