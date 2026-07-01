import { z } from 'zod';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { ContactSubmission } from '../../database/models';
import { stripHtml } from '../../utils/sanitize';
import { sendSuccess } from '../../utils/api-response';
import { validate } from '../../middlewares';
import { contactLimiter } from '../../middlewares/rate-limit.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { logger } from '../../config/logger';
import { queueEmail } from '../../jobs/queues/email.queue';

/**
 * Contact form (§ POST /contact). Single-file module — the feature is small
 * enough that the full controller/service/repository split would add ceremony
 * without value. Persists the submission and (in Stage 8) queues concierge
 * notification + auto-reply emails.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
});

async function submit(req: Request, res: Response): Promise<void> {
  const { name, email, message } = req.body as z.infer<typeof contactSchema>;
  await ContactSubmission.create({
    name: stripHtml(name),
    email,
    message: stripHtml(message),
  });
  logger.info({ email }, 'Contact form submitted');
  void queueEmail({ type: 'contact-admin-notify', to: '', name, email, message });
  void queueEmail({ type: 'contact-auto-reply', to: email, name });
  sendSuccess(res, null, 200, 'Message received');
}

const router = Router();
router.post('/', contactLimiter, validate({ body: contactSchema }), asyncHandler(submit));

export const contactRoutes = router;
