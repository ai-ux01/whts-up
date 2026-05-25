/** Normalize to E.164 for storage; WhatsApp API uses digits only (no +). */
export function normalizePhoneE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // 10-digit India mobile → +91XXXXXXXXXX
  if (digits.length === 10) return `+91${digits}`;

  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;

  return raw.trim().startsWith('+') ? `+${digits}` : `+${digits}`;
}

export function toWhatsAppRecipientId(e164: string): string {
  return e164.replace(/\D/g, '');
}
