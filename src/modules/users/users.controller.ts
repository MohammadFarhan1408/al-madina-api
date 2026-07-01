import type { Request, Response } from 'express';
import { usersService } from './users.service';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';

function userId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized('Authentication required', ERROR_CODES.UNAUTHORIZED);
  return req.user.id;
}

export const usersController = {
  async updateProfile(req: Request, res: Response): Promise<void> {
    const user = await usersService.updateProfile(userId(req), req.body);
    sendSuccess(res, user);
  },

  async updatePreferences(req: Request, res: Response): Promise<void> {
    const prefs = await usersService.updatePreferences(userId(req), req.body);
    sendSuccess(res, prefs);
  },

  async registerPushToken(req: Request, res: Response): Promise<void> {
    await usersService.registerPushToken(userId(req), req.body);
    sendCreated(res, null, 'Push token registered');
  },
};
