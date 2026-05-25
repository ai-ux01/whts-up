/** Meta customer care window: free-form replies within 24h of last inbound message. */
export const WHATSAPP_SESSION_MS = 24 * 60 * 60 * 1000;

export function isSessionOpen(
  lastCustomerMessageAt: Date | string | null | undefined,
): boolean {
  if (!lastCustomerMessageAt) return false;
  const at =
    lastCustomerMessageAt instanceof Date
      ? lastCustomerMessageAt
      : new Date(lastCustomerMessageAt);
  if (Number.isNaN(at.getTime())) return false;
  return Date.now() - at.getTime() < WHATSAPP_SESSION_MS;
}

export function sessionExpiresAt(
  lastCustomerMessageAt: Date | string | null | undefined,
): Date | null {
  if (!lastCustomerMessageAt) return null;
  const at =
    lastCustomerMessageAt instanceof Date
      ? lastCustomerMessageAt
      : new Date(lastCustomerMessageAt);
  if (Number.isNaN(at.getTime())) return null;
  return new Date(at.getTime() + WHATSAPP_SESSION_MS);
}
