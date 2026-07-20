import { codProvider } from './cod.provider';
import { simulatedProvider } from './simulated.provider';
import type { PaymentProvider } from './payment-provider';
import type { PaymentProviderName } from '../../../constants/business';

/**
 * Provider registry keyed by name. `paymentMethod: 'cod'` on the order maps
 * to `cod`; `'card'`/`'wallet'` both map to `simulated` today.
 *
 * ── Adding a real gateway later ──────────────────────────────────────────
 * No real payment gateway is configured in this project yet (verified: no
 * SDK dependency, no gateway env vars). To wire one in:
 *   1. Pick a provider (e.g. Stripe, Telr, PayTabs, Network International —
 *      AED-capable, since all pricing in this app is AED).
 *   2. Add its API key/secret and webhook signing secret to src/config and
 *      .env.example (mirror PAYMENT_WEBHOOK_SECRET's pattern).
 *   3. Add `providers/<name>.provider.ts` implementing `PaymentProvider`
 *      (initiate/refund), using the real SDK.
 *   4. Register it below as e.g. `gateway: gatewayProvider`, add `'gateway'`
 *      to PAYMENT_PROVIDERS in constants/business.ts, and point 'card'/
 *      'wallet' at it instead of `simulated`.
 *   5. Replace the HMAC check in payments.routes.ts's /payments/callback
 *      route with the provider's real webhook signature verification.
 * Nothing else in orders/payments services needs to change — they only ever
 * call through the PaymentProvider interface.
 */
export const paymentProviders: Record<PaymentProviderName, PaymentProvider> = {
  cod: codProvider,
  simulated: simulatedProvider,
};

export function providerForMethod(paymentMethod: 'card' | 'wallet' | 'cod'): PaymentProviderName {
  return paymentMethod === 'cod' ? 'cod' : 'simulated';
}
