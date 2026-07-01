import { Types } from 'mongoose';
import {
  User,
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

  /** Includes the normally-hidden passwordHash for credential checks. */
  findByEmailWithPassword(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
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

  createRefreshToken(userId: Types.ObjectId, tokenHash: string, expiresAt: Date): Promise<IRefreshToken> {
    return RefreshToken.create({ userId, token: tokenHash, expiresAt });
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
