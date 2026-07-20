import type { ITransaction } from '../../../database/models';
import type { TransactionStatus } from '../../../constants/business';

export interface InitiatePaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export interface ProviderResult {
  status: TransactionStatus;
  providerReference?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Seam every payment provider implements — COD and the simulated gateway
 * today, a real gateway (Stripe/Telr/PayTabs/...) later as one more file
 * registered in ./index.ts. No provider auto-confirms 'succeeded' from
 * initiate(); confirmation always comes from a separate, server-verified
 * event (webhook callback for gateways, admin delivery-confirmation for COD).
 */
export interface PaymentProvider {
  initiate(input: InitiatePaymentInput): Promise<ProviderResult>;
  refund(transaction: ITransaction): Promise<ProviderResult>;
}
