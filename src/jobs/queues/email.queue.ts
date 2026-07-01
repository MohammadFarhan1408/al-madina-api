import { enqueue, QUEUE_NAMES } from '../queue-factory';

export type EmailJob =
  | { type: 'welcome'; to: string; name: string }
  | { type: 'password-reset'; to: string; resetUrl: string }
  | { type: 'order-confirmation'; to: string; reference: string; total: number; currency?: string }
  | { type: 'shipping-update'; to: string; reference: string; status: string }
  | { type: 'contact-auto-reply'; to: string; name: string }
  | { type: 'contact-admin-notify'; to: string; name: string; email: string; message: string };

/** Enqueue an email job (best-effort; see queue-factory). */
export function queueEmail(job: EmailJob): Promise<void> {
  return enqueue(QUEUE_NAMES.EMAIL, job.type, job);
}
