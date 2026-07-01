import type { Job } from 'bullmq';
import { notificationsRepository } from '../../modules/notifications/notifications.repository';
import type { CreateNotificationJob } from '../queues/notification.queue';

/** Persist an in-app notification for a user. */
export async function processNotification(job: Job<CreateNotificationJob>): Promise<void> {
  const { userId, kind, title, body, metadata } = job.data;
  await notificationsRepository.create({ userId, kind, title, body, metadata });
}
