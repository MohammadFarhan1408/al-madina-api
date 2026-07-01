import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../config/logger';

let transporter: Transporter | null = null;

/** Lazily create the SMTP transport (only when email is configured). */
function getTransporter(): Transporter | null {
  if (!config.smtp.enabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email via SMTP. When SMTP is not configured (e.g. local dev), the
 * message is logged instead of sent so flows still work end-to-end without a
 * mail server. Throws on real send failures so the BullMQ job can retry.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    logger.info({ to: message.to, subject: message.subject }, '[mail:dev] email logged (SMTP not configured)');
    return;
  }
  await tx.sendMail({
    from: config.smtp.from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  logger.info({ to: message.to, subject: message.subject }, 'Email sent');
}
