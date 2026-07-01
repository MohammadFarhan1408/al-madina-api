import type { IUser } from '../../database/models';

/** Public-safe user shape returned in auth responses (no passwordHash). */
export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  avatar?: string;
  role: string;
  tier: string;
  memberSince: Date;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Result of a successful sign-up / sign-in. */
export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

/** Result of a token refresh (rotated pair). */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Maps a User document to the public-safe shape. */
export function toPublicUser(user: IUser): PublicUser {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    tier: user.tier,
    memberSince: user.memberSince,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
