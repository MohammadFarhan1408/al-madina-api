import type { Request, Response } from 'express';
import { paymentsService } from './payments.service';
import { constructStripeEvent } from './providers/stripe.provider';
import { sendSuccess } from '../../utils/api-response';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { config } from '../../config';

export const paymentsController = {
  /** POST /payments/callback — simulated-gateway webhook stand-in (signature
   * verified by the verifyWebhookSignature middleware before this runs). */
  async callback(req: Request, res: Response): Promise<void> {
    const { transactionId, status, providerReference } = req.body;
    const transaction = await paymentsService.settleFromGateway(transactionId, status, providerReference);
    sendSuccess(res, transaction);
  },

  /** POST /payments/stripe/webhook — req.body is the raw Buffer (app.ts mounts
   * express.raw here), because Stripe signs the exact bytes it sent. */
  async stripeWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.header('stripe-signature');
    if (!config.stripe.webhookSecret || !signature || !Buffer.isBuffer(req.body)) {
      throw ApiError.unauthorized('Missing webhook signature', ERROR_CODES.INVALID_WEBHOOK_SIGNATURE);
    }
    let event;
    try {
      event = constructStripeEvent(req.body, signature);
    } catch {
      throw ApiError.unauthorized('Invalid webhook signature', ERROR_CODES.INVALID_WEBHOOK_SIGNATURE);
    }
    await paymentsService.handleStripeEvent(event);
    res.json({ received: true });
  },
};
