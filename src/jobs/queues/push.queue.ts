import { enqueue, QUEUE_NAMES } from '../queue-factory';

export type PushJob =
  | { type: 'order-update'; userId: string; reference: string; status: string }
  | { type: 'promo-broadcast'; tier?: string; title: string; body: string }
  | { type: 'back-in-stock'; productId: string; productName: string };

/** Enqueue a push-notification job (best-effort). */
export function queuePush(job: PushJob): Promise<void> {
  return enqueue(QUEUE_NAMES.PUSH, job.type, job);
}
