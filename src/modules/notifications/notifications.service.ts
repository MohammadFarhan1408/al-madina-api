import { notificationsRepository } from './notifications.repository';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import type { PaginationQuery } from '../../utils/common.schema';

export const notificationsService = {
  list(userId: string, query: PaginationQuery) {
    return notificationsRepository.listByUser(userId, query.page, query.limit);
  },

  async markRead(userId: string, id: string) {
    const notification = await notificationsRepository.markRead(userId, id);
    if (!notification) {
      throw ApiError.notFound('Notification not found', ERROR_CODES.NOTIFICATION_NOT_FOUND);
    }
    return notification;
  },

  async markAllRead(userId: string): Promise<void> {
    await notificationsRepository.markAllRead(userId);
  },
};
