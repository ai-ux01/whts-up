/** Turn Meta Graph API error JSON into a short, actionable message. */
export function formatWhatsAppApiError(raw: string, context = 'send'): string {
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string; code?: number };
    };
    const code = parsed.error?.code;
    const metaMessage = parsed.error?.message ?? '';

    if (code === 131030) {
      return (
        'Recipient not on Meta test allowlist (error 131030). In Meta Developer Console → ' +
        'WhatsApp → API Setup → add each CSV number under "To" / recipient phone numbers, ' +
        'or move the app to Live mode for production.'
      );
    }

    if (code === 132000) {
      return `Template error: ${metaMessage}. Check template name and language (e.g. en_US).`;
    }

    if (code === 190 || code === 10) {
      return `Access token invalid or expired (${code}). Generate a new token in Meta → WhatsApp → API Setup.`;
    }

    if (metaMessage) return `WhatsApp ${context} failed: ${metaMessage} (${code ?? 'unknown'})`;
  } catch {
    // not JSON
  }

  return `WhatsApp ${context} failed: ${raw.slice(0, 500)}`;
}
