import type { Request, Response } from 'express';
import { notificationsService } from './notifications.service';
import { sendSuccess } from '../../utils/api-response';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';

function userId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized('Authentication required', ERROR_CODES.UNAUTHORIZED);
  return req.user.id;
}

export const notificationsController = {
  async list(req: Request, res: Response): Promise<void> {
    const result = await notificationsService.list(userId(req), req.query as never);
    sendSuccess(res, result);
  },

  async markRead(req: Request, res: Response): Promise<void> {
    const notification = await notificationsService.markRead(userId(req), req.params.id);
    sendSuccess(res, notification);
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    await notificationsService.markAllRead(userId(req));
    sendSuccess(res, null, 200, 'All marked as read');
  },
};
