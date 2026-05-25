export const LEAD_SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  meta_ads: 'Meta Ads',
  meta_organic: 'Meta organic',
  google_ads: 'Google Ads',
  campaign: 'Campaign',
  manual: 'Manual',
};

export function leadSourceLabel(source: string | null | undefined): string {
  if (!source) return 'Unknown';
  return LEAD_SOURCE_LABELS[source] ?? source;
}
