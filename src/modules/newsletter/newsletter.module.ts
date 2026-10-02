import { z } from 'zod';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { NewsletterSubscriber } from '../../database/models';
import { sendSuccess } from '../../utils/api-response';
import { validate } from '../../middlewares';
import { newsletterLimiter } from '../../middlewares/rate-limit.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { logger } from '../../config/logger';

/**
 * Newsletter signup (homepage footer form). Single-file module — same
 * reasoning as contact.module.ts: too small to warrant a full
 * controller/service/repository split. Idempotent: re-submitting an email
 * that's already subscribed is a no-op success, and a previously-unsubscribed
 * email is reactivated, rather than erroring either way — a signup form has
 * no reason to expose "you're already on the list" as a failure.
 *
 * No email-sending integration yet (no provider chosen) — this only persists
 * the subscription. See docs/business-rules.md before wiring a real
 * campaign provider (Mailchimp/Resend/etc).
 */
export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

async function subscribe(req: Request, res: Response): Promise<void> {
  const { email } = req.body as z.infer<typeof newsletterSchema>;

  await NewsletterSubscriber.updateOne(
    { email },
    { $set: { isActive: true } },
    { upsert: true },
  ).exec();

  logger.info({ email }, 'Newsletter signup');
  sendSuccess(res, null, 200, 'Subscribed');
}

const router = Router();
router.post('/', newsletterLimiter, validate({ body: newsletterSchema }), asyncHandler(subscribe));

export const newsletterRoutes = router;
