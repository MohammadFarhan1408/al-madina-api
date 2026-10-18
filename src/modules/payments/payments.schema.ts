import { z } from 'zod';
import { config } from '../../config';

/** Where Stripe sends the customer back to. Only allow-listed app schemes are accepted
 * (never an arbitrary URL), so it can't be abused as an open redirect. */
export const returnUrlSchema = z
  .string()
  .max(500)
  .refine(
    (value) => {
      try {
        return config.mobileReturnSchemes.includes(new URL(value).protocol.replace(':', '').toLowerCase());
      } catch {
        return false;
      }
    },
    { message: 'Unsupported returnUrl' },
  );

/** POST /orders/:id/payments/retry — retry needs a fresh idempotency key, no body fields. */
export const retryPaymentSchema = z.object({
  idempotencyKey: z.string().uuid('idempotencyKey must be a UUID'),
  /** Optional app deep link to return to after Stripe Checkout (defaults to the web storefront). */
  returnUrl: returnUrlSchema.optional(),
});

/** POST /payments/callback — the simulated-gateway webhook stand-in. */
export const simulateCallbackSchema = z.object({
  transactionId: z.string().min(1),
  status: z.enum(['succeeded', 'failed']),
  providerReference: z.string().optional(),
});

/** POST /admin/orders/:id/payments/refund */
export const refundPaymentSchema = z.object({
  transactionId: z.string().min(1),
});

export type RetryPaymentInput = z.infer<typeof retryPaymentSchema>;
export type SimulateCallbackInput = z.infer<typeof simulateCallbackSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
