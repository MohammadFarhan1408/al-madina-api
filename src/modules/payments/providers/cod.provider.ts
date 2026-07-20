import type { PaymentProvider, InitiatePaymentInput, ProviderResult } from './payment-provider';

/**
 * Cash on Delivery — no gateway to call. Money is collected at the door, so a
 * COD transaction stays 'pending' until an admin marks the order 'delivered'
 * (see payments.service.confirmCodDelivery, wired from orders.service.updateStatus).
 */
export const codProvider: PaymentProvider = {
  async initiate(_input: InitiatePaymentInput): Promise<ProviderResult> {
    return { status: 'pending' };
  },

  async refund(): Promise<ProviderResult> {
    // Cash was collected in person; a refund is an admin-recorded fact, not an API call.
    return { status: 'refunded' };
  },
};
