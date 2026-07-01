import type { Job } from 'bullmq';
import { sendMail } from '../../emails/mailer';
import { emailTemplates } from '../../emails/templates';
import { config } from '../../config';
import type { EmailJob } from '../queues/email.queue';

/** Resolve an email job to a concrete message and send it. */
export async function processEmail(job: Job<EmailJob>): Promise<void> {
  const data = job.data;

  switch (data.type) {
    case 'welcome': {
      const { subject, html } = emailTemplates.welcome(data.name);
      await sendMail({ to: data.to, subject, html });
      break;
    }
    case 'password-reset': {
      const { subject, html } = emailTemplates.passwordReset(data.resetUrl);
      await sendMail({ to: data.to, subject, html });
      break;
    }
    case 'order-confirmation': {
      const { subject, html } = emailTemplates.orderConfirmation(data);
      await sendMail({ to: data.to, subject, html });
      break;
    }
    case 'shipping-update': {
      const { subject, html } = emailTemplates.shippingUpdate(data);
      await sendMail({ to: data.to, subject, html });
      break;
    }
    case 'contact-auto-reply': {
      const { subject, html } = emailTemplates.contactAutoReply(data.name);
      await sendMail({ to: data.to, subject, html });
      break;
    }
    case 'contact-admin-notify': {
      const { subject, html } = emailTemplates.contactAdminNotify(data);
      await sendMail({ to: config.adminEmail, subject, html });
      break;
    }
  }
}
