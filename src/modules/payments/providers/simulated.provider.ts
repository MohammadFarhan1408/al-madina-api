import { randomUUID } from 'node:crypto';
import type { PaymentProvider, InitiatePaymentInput, ProviderResult } from './payment-provider';

/**
 * Stands in for card/wallet until a real gateway is chosen. Mirrors a real
 * async gateway honestly: initiate() only ever returns 'processing' — final
 * status ('succeeded'/'failed') only ever arrives via POST /payments/callback,
 * signature-verified like a real webhook (see payments.routes.ts). Nothing
 * here auto-resolves the transaction.
 */
export const simulatedProvider: PaymentProvider = {
  async initiate(_input: InitiatePaymentInput): Promise<ProviderResult> {
    return { status: 'processing', providerReference: randomUUID() };
  },

  async refund(): Promise<ProviderResult> {
    // No real gateway to call refund on; record the refund locally.
    return { status: 'refunded' };
  },
};
