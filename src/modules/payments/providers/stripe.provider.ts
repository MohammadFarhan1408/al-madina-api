import Stripe from 'stripe';
import { config } from '../../../config';
import { ApiError } from '../../../utils/api-error';
import { ERROR_CODES } from '../../../constants/error-codes';
import type { PaymentProvider, InitiatePaymentInput, ProviderResult } from './payment-provider';

let client: Stripe | undefined;
// The placeholder key only lets the SDK construct for local signature checks;
// real API calls happen only when STRIPE_SECRET_KEY is set (providerForMethod).
const stripe = () => (client ??= new Stripe(config.stripe.secretKey || 'sk_unset'));

/** Stripe's minimum Checkout Session lifetime is 30 minutes. After it lapses
 * the checkout.session.expired webhook fails the transaction, which is what
 * unlocks the retry flow for an abandoned payment. */
const SESSION_TTL_SECONDS = 31 * 60;

/** Verifies Stripe's signature against the *raw* request bytes. */
export function constructStripeEvent(rawBody: Buffer, signature: string): Stripe.Event {
  return stripe().webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

/**
 * Hosted Stripe Checkout: initiate() creates a Checkout Session and returns its
 * URL in metadata.checkoutUrl; the customer pays on Stripe. Like every other
 * provider, it never reports 'succeeded' itself — that only arrives via the
 * signature-verified webhook (POST /payments/stripe/webhook).
 */
export const stripeProvider: PaymentProvider = {
  async initiate(input: InitiatePaymentInput): Promise<ProviderResult> {
    const session = await stripe().checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: input.orderId,
        metadata: { orderId: input.orderId },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amount * 100, // AED integer -> fils
              product_data: { name: `Al Madina Ittar order ${input.reference}` },
            },
          },
        ],
        success_url: input.returnUrl,
        cancel_url: input.returnUrl,
        expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return { status: 'processing', providerReference: session.id, metadata: { checkoutUrl: session.url } };
  },

  async refund(transaction): Promise<ProviderResult> {
    if (!transaction.providerReference) {
      throw ApiError.conflict('Transaction has no Stripe session', ERROR_CODES.PAYMENT_NOT_REFUNDABLE);
    }
    const session = await stripe().checkout.sessions.retrieve(transaction.providerReference);
    if (typeof session.payment_intent !== 'string') {
      throw ApiError.conflict('Stripe payment not found for this session', ERROR_CODES.PAYMENT_NOT_REFUNDABLE);
    }
    await stripe().refunds.create({ payment_intent: session.payment_intent });
    return { status: 'refunded' };
  },
};
