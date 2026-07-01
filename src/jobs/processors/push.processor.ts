import type { Job } from 'bullmq';
import { PushToken } from '../../database/models';
import { logger } from '../../config/logger';
import type { PushJob } from '../queues/push.queue';

/**
 * Deliver a push notification. The actual Expo/FCM dispatch is stubbed — this
 * resolves the target device tokens and logs the payload. Wiring a real Expo
 * Push client is a deployment concern (§15 Push Notifications).
 */
export async function processPush(job: Job<PushJob>): Promise<void> {
  const data = job.data;
  let tokens: string[] = [];

  if (data.type === 'order-update') {
    const docs = await PushToken.find({ userId: data.userId }).select('token').lean<{ token: string }[]>().exec();
    tokens = docs.map((d) => d.token);
  } else {
    // promo-broadcast / back-in-stock target many users; resolution would be
    // batched in production. Left as a no-op stub here.
    tokens = [];
  }

  logger.info({ type: data.type, recipients: tokens.length }, '[push] dispatch (Expo/FCM stubbed)');
  // TODO (deploy): send via Expo Push API / FCM using `tokens`.
}
