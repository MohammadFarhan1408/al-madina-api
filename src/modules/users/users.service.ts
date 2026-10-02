import { usersRepository } from './users.repository';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { toPublicUser, type PublicUser } from '../auth/auth.types';
import type {
  UpdateProfileInput,
  UpdatePreferencesInput,
  PushTokenInput,
} from './users.schema';
import type { IUserPreference } from '../../database/models';

export const usersService = {
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await usersRepository.updateProfile(userId, input);
    if (!user) {
      throw ApiError.notFound('User not found', ERROR_CODES.USER_NOT_FOUND);
    }
    return toPublicUser(user);
  },

  /** Every user gets a UserPreference row at sign-up, but fall back to an
   * upsert-with-defaults for the rare case one's missing (e.g. pre-existing
   * data) instead of 404ing a settings screen on first load. */
  async getPreferences(userId: string): Promise<IUserPreference> {
    const existing = await usersRepository.getPreferences(userId);
    return existing ?? usersRepository.upsertPreferences(userId, {});
  },

  updatePreferences(userId: string, input: UpdatePreferencesInput): Promise<IUserPreference> {
    return usersRepository.upsertPreferences(userId, input);
  },

  async registerPushToken(userId: string, input: PushTokenInput): Promise<void> {
    await usersRepository.upsertPushToken(userId, input.token, input.platform);
  },
};
