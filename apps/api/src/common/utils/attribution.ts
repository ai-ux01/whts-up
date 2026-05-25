export interface WhatsAppReferral {
  source_url?: string;
  source_id?: string;
  source_type?: string;
  headline?: string;
  body?: string;
  media_type?: string;
}

export interface LeadAttribution {
  leadSource: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/** Map Meta WhatsApp referral object to CRM attribution fields. */
export function attributionFromReferral(
  referral?: WhatsAppReferral,
  workspaceDefaultUtm?: string | null,
): LeadAttribution | null {
  if (!referral) return null;

  const sourceType = referral.source_type?.toLowerCase() ?? '';
  let leadSource = 'whatsapp';
  let utmSource = workspaceDefaultUtm ?? 'whatsapp';
  let utmMedium: string | undefined;
  let utmCampaign: string | undefined;

  if (sourceType === 'ad' || referral.source_id) {
    leadSource = 'meta_ads';
    utmSource = 'meta';
    utmMedium = 'cpc';
    utmCampaign = referral.source_id ?? referral.headline ?? 'click_to_whatsapp';
  } else if (sourceType === 'post' || sourceType === 'story') {
    leadSource = 'meta_organic';
    utmSource = 'meta';
    utmMedium = sourceType;
  }

  return { leadSource, utmSource, utmMedium, utmCampaign };
}

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp (direct)',
  meta_ads: 'Meta Ads',
  meta_organic: 'Meta organic',
  google_ads: 'Google Ads',
  campaign: 'Campaign',
  manual: 'Manual',
};
