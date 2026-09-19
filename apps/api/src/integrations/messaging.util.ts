/**
 * Pure, dependency-free helpers shared by the SMS / Email / Instagram services.
 * Kept separate so they can be unit-tested without the Nest DI container.
 */

/** Ensure E.164-ish format; default to India (+91) when no country code is present. */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

/** A valid Instagram-scoped ID (IGSID) is a long numeric string. */
export function extractIgsid(recipient: string): string | null {
  const trimmed = recipient.trim();
  return /^\d{6,}$/.test(trimmed) ? trimmed : null;
}

export type SmsProvider = 'twilio' | 'msg91' | 'mock';

/** Decide SMS provider from an explicit override or detected credentials. */
export function resolveSmsProvider(env: {
  SMS_PROVIDER?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  MSG91_AUTH_KEY?: string;
}): SmsProvider {
  const explicit = env.SMS_PROVIDER?.trim().toLowerCase();
  if (explicit === 'twilio' || explicit === 'msg91' || explicit === 'mock') {
    return explicit;
  }
  if (env.TWILIO_ACCOUNT_SID?.trim() && env.TWILIO_AUTH_TOKEN?.trim()) return 'twilio';
  if (env.MSG91_AUTH_KEY?.trim()) return 'msg91';
  return 'mock';
}

export type EmailProvider = 'resend' | 'sendgrid' | 'mock';

/** Decide email provider from an explicit override or detected credentials. */
export function resolveEmailProvider(env: {
  EMAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  SENDGRID_API_KEY?: string;
}): EmailProvider {
  const explicit = env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (explicit === 'resend' || explicit === 'sendgrid' || explicit === 'mock') {
    return explicit;
  }
  if (env.RESEND_API_KEY?.trim()) return 'resend';
  if (env.SENDGRID_API_KEY?.trim()) return 'sendgrid';
  return 'mock';
}

/** Wrap plain text in minimal HTML; pass through if it already looks like HTML. */
export function toEmailHtml(body: string): string {
  if (/<[a-z][\s\S]*>/i.test(body)) return body;
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111">${escaped}</div>`;
}
