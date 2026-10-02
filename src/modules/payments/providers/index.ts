import { codProvider } from './cod.provider';
import { simulatedProvider } from './simulated.provider';
import { stripeProvider } from './stripe.provider';
import { config } from '../../../config';
import type { PaymentProvider } from './payment-provider';
import type { PaymentProviderName } from '../../../constants/business';

/**
 * Provider registry keyed by name. `paymentMethod: 'cod'` on the order maps
 * to `cod`; `'card'`/`'wallet'` map to `stripe` when STRIPE_SECRET_KEY is set,
 * otherwise to `simulated`.
 *
 * Another gateway = one more provider file implementing `PaymentProvider`,
 * registered here, plus its own verified webhook route in payments.routes.ts.
 */
export const paymentProviders: Record<PaymentProviderName, PaymentProvider> = {
  cod: codProvider,
  simulated: simulatedProvider,
  stripe: stripeProvider,
};

export function providerForMethod(paymentMethod: 'card' | 'wallet' | 'cod'): PaymentProviderName {
  if (paymentMethod === 'cod') return 'cod';
  return config.stripe.enabled ? 'stripe' : 'simulated';
}
