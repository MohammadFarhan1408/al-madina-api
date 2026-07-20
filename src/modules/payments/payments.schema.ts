import { z } from 'zod';

/** POST /orders/:id/payments/retry — retry needs a fresh idempotency key, no body fields. */
export const retryPaymentSchema = z.object({
  idempotencyKey: z.string().uuid('idempotencyKey must be a UUID'),
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
