import { enqueue, QUEUE_NAMES } from '../queue-factory';
import type { NotificationKind } from '../../constants/business';

export interface CreateNotificationJob {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

/** Enqueue creation of an in-app notification (best-effort). */
export function queueNotification(job: CreateNotificationJob): Promise<void> {
  return enqueue(QUEUE_NAMES.NOTIFICATION, 'create-in-app-notification', job);
}
