import { Types } from 'mongoose';
import {
  User,
  UserPreference,
  PushToken,
  type IUser,
  type IUserPreference,
  type DevicePlatform,
} from '../../database/models';

export const usersRepository = {
  updateProfile(userId: string, data: { fullName?: string; avatar?: string }): Promise<IUser | null> {
    return User.findByIdAndUpdate(userId, { $set: data }, { new: true }).exec();
  },

  async upsertPreferences(
    userId: string,
    data: Partial<IUserPreference>,
  ): Promise<IUserPreference> {
    const pref = await UserPreference.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
    return pref;
  },

  getPreferences(userId: string): Promise<IUserPreference | null> {
    return UserPreference.findOne({ userId: new Types.ObjectId(userId) }).exec();
  },

  /** Register or refresh a device push token (idempotent on token). */
  upsertPushToken(userId: string, token: string, platform: DevicePlatform) {
    return PushToken.findOneAndUpdate(
      { token },
      { $set: { userId: new Types.ObjectId(userId), platform } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
  },
};
