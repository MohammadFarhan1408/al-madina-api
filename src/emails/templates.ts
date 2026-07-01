import { config } from '../config';
import { DEFAULT_CURRENCY } from '../constants/business';

/**
 * Minimal, dependency-free HTML email templates (§15 Email Notifications).
 * Each returns a subject + html pair. Kept inline (no file IO) for portability.
 */

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="font-family:Georgia,serif;background:#faf7f2;padding:24px;color:#2c2419">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8e0d2;border-radius:8px;overflow:hidden">
      <div style="background:#1a1410;color:#d4af37;padding:20px 24px;font-size:20px;letter-spacing:2px">AL MADINA</div>
      <div style="padding:24px">
        <h1 style="font-size:18px;margin:0 0 16px">${title}</h1>
        ${body}
      </div>
      <div style="padding:16px 24px;background:#faf7f2;font-size:12px;color:#8a7f6d">Al Madina — Luxury Arabian Fragrances</div>
    </div>
  </body></html>`;
}

export const emailTemplates = {
  welcome(name: string) {
    return {
      subject: 'Welcome to Al Madina',
      html: layout(
        `Welcome, ${name}`,
        `<p>Your account is ready. Explore our curated collection of luxury Arabian ittars.</p>`,
      ),
    };
  },

  passwordReset(resetUrl: string) {
    return {
      subject: 'Reset your Al Madina password',
      html: layout(
        'Password reset requested',
        `<p>Tap the button below to set a new password. This link expires in 1 hour.</p>
         <p><a href="${resetUrl}" style="display:inline-block;background:#d4af37;color:#1a1410;padding:12px 24px;border-radius:6px;text-decoration:none">Reset password</a></p>
         <p style="font-size:12px;color:#8a7f6d">If you didn't request this, you can safely ignore this email.</p>`,
      ),
    };
  },

  orderConfirmation(order: { reference: string; total: number; currency?: string }) {
    return {
      subject: `Order confirmed — ${order.reference}`,
      html: layout(
        'Thank you for your order',
        `<p>Your order <strong>${order.reference}</strong> has been received and is being processed.</p>
         <p>Total: <strong>${order.total} ${order.currency ?? DEFAULT_CURRENCY}</strong></p>`,
      ),
    };
  },

  shippingUpdate(order: { reference: string; status: string }) {
    return {
      subject: `Order ${order.reference} — ${order.status}`,
      html: layout(
        'Order status update',
        `<p>Your order <strong>${order.reference}</strong> is now <strong>${order.status}</strong>.</p>`,
      ),
    };
  },

  contactAutoReply(name: string) {
    return {
      subject: 'We received your message',
      html: layout(
        `Thank you, ${name}`,
        `<p>Our concierge team has received your message and will respond shortly.</p>`,
      ),
    };
  },

  contactAdminNotify(submission: { name: string; email: string; message: string }) {
    return {
      subject: `New contact submission from ${submission.name}`,
      html: layout(
        'New contact submission',
        `<p><strong>From:</strong> ${submission.name} (${submission.email})</p>
         <p><strong>Message:</strong></p><p>${submission.message}</p>`,
      ),
    };
  },
};

/** Build the password-reset deep link served to the client app. */
export function buildResetUrl(token: string): string {
  return `${config.clientUrl}/reset-password?token=${encodeURIComponent(token)}`;
}
