import { Router, type NextFunction, type Request, type Response } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { paymentsController } from './payments.controller';
import { simulateCallbackSchema } from './payments.schema';
import { validate } from '../../middlewares';
import { asyncHandler } from '../../utils/async-handler';
import { ApiError } from '../../utils/api-error';
import { ERROR_CODES } from '../../constants/error-codes';
import { config } from '../../config';

/** Verifies X-Webhook-Signature = HMAC-SHA256(rawBody, PAYMENT_WEBHOOK_SECRET),
 * hex-encoded. Kept inline (not a shared middleware) since it has one call
 * site; a real gateway's callback would verify its own signature scheme here
 * instead — see modules/payments/providers/index.ts. */
function verifyWebhookSignature(req: Request, _res: Response, next: NextFunction): void {
  const signature = req.header('X-Webhook-Signature');
  if (!signature || !Buffer.isBuffer(req.body)) {
    throw ApiError.unauthorized('Missing webhook signature', ERROR_CODES.INVALID_WEBHOOK_SIGNATURE);
  }
  // Sign-check the exact bytes received (app.ts mounts express.raw here), never
  // a re-serialisation of a parsed body.
  const expected = createHmac('sha256', config.paymentWebhookSecret).update(req.body).digest('hex');
  const provided = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) {
    throw ApiError.unauthorized('Invalid webhook signature', ERROR_CODES.INVALID_WEBHOOK_SIGNATURE);
  }
  try {
    req.body = JSON.parse(req.body.toString('utf8'));
  } catch {
    throw ApiError.badRequest('Malformed JSON body', ERROR_CODES.VALIDATION_ERROR);
  }
  next();
}

const router = Router();

// No auth — this stands in for a real gateway's public webhook endpoint,
// trust comes from the signature instead of a session.
router.post(
  '/callback',
  verifyWebhookSignature,
  validate({ body: simulateCallbackSchema }),
  asyncHandler(paymentsController.callback),
);

// Stripe verifies its own signature in the controller, over the raw bytes.
router.post('/stripe/webhook', asyncHandler(paymentsController.stripeWebhook));

export const paymentsRoutes = router;
