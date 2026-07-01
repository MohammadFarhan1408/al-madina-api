import { Schema, model, type Document, type Types } from 'mongoose';
import { USER_TIERS, USER_ROLES, type UserTier, type UserRole } from '../../constants/business';

export interface IUser extends Document {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  role: UserRole;
  tier: UserTier;
  memberSince: Date;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Defensively strips passwordHash on serialization even if it was selected. */
function userTransform(_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> {
  ret.id = ret._id?.toString();
  delete ret._id;
  delete ret.__v;
  delete ret.passwordHash;
  return ret;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Never returned by default — must be explicitly selected.
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String },
    role: { type: String, enum: USER_ROLES, default: 'user', index: true },
    tier: { type: String, enum: USER_TIERS, default: 'Member', index: true },
    memberSince: { type: Date, default: Date.now },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false, transform: userTransform },
    toObject: { virtuals: true, versionKey: false, transform: userTransform },
  },
);

export const User = model<IUser>('User', userSchema);
