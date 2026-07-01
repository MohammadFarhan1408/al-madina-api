import { Types } from 'mongoose';
import { Notification, type INotification } from '../../database/models';
import { paginate } from '../../utils/paginate';
import type { Paginated } from '../../types/api.types';
import type { NotificationKind } from '../../constants/business';

export const notificationsRepository = {
  listByUser(userId: string, page: number, limit: number): Promise<Paginated<INotification>> {
    return paginate<INotification>(
      Notification,
      { userId: new Types.ObjectId(userId) },
      { page, limit, sort: { date: -1 } },
    );
  },

  markRead(userId: string, id: string): Promise<INotification | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return Notification.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $set: { read: true } },
      { new: true },
    ).exec();
  },

  async markAllRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { $set: { read: true } },
    ).exec();
  },

  /** Create a notification (used by jobs/admin broadcasts). */
  create(data: {
    userId: Types.ObjectId | string;
    kind: NotificationKind;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }): Promise<INotification> {
    return Notification.create({
      ...data,
      userId: new Types.ObjectId(data.userId),
    });
  },

  /** Bulk insert for broadcasts. */
  insertMany(docs: Array<{ userId: Types.ObjectId; kind: NotificationKind; title: string; body: string }>) {
    return Notification.insertMany(docs);
  },
};
