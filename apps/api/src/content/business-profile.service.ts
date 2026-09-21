import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BusinessProfileInput {
  industry?: string;
  location?: string;
  description?: string;
  targetCustomer?: string;
  usp?: string;
  priceRange?: string;
  website?: string;
  whatsappNumber?: string;
  offers?: string[];
  products?: Array<{ name: string; description?: string; price?: string }>;
  competitors?: string[];
  keywords?: string[];
}

/**
 * Phase 2 — Marketing Brain.
 * Central business profile used as AI context across content generation.
 */
@Injectable()
export class BusinessProfileService {
  private readonly logger = new Logger(BusinessProfileService.name);

  constructor(private prisma: PrismaService) {}

  async get(workspaceId: string) {
    const existing = await this.prisma.businessProfile.findUnique({
      where: { workspaceId },
    });
    if (existing) return existing;

    // Return an empty shell so the UI can render a blank form.
    return this.prisma.businessProfile.create({
      data: { workspaceId },
    });
  }

  async upsert(workspaceId: string, data: BusinessProfileInput) {
    const payload = {
      industry: data.industry ?? null,
      location: data.location ?? null,
      description: data.description ?? null,
      targetCustomer: data.targetCustomer ?? null,
      usp: data.usp ?? null,
      priceRange: data.priceRange ?? null,
      website: data.website ?? null,
      whatsappNumber: data.whatsappNumber ?? null,
      offers: data.offers ?? [],
      products: (data.products ?? []) as object,
      competitors: data.competitors ?? [],
      keywords: data.keywords ?? [],
    };

    return this.prisma.businessProfile.upsert({
      where: { workspaceId },
      update: payload,
      create: { workspaceId, ...payload },
    });
  }

  /**
   * Builds a compact, prompt-ready context block from the profile.
   * Returns an empty string when the profile has no meaningful data, so
   * callers can safely concatenate it into any system prompt.
   */
  async buildContext(workspaceId: string): Promise<string> {
    const p = await this.prisma.businessProfile.findUnique({
      where: { workspaceId },
    });
    if (!p) return '';

    const lines: string[] = [];
    if (p.industry) lines.push(`Industry: ${p.industry}`);
    if (p.location) lines.push(`Location / service area: ${p.location}`);
    if (p.description) lines.push(`About the business: ${p.description}`);
    if (p.targetCustomer) lines.push(`Target customer: ${p.targetCustomer}`);
    if (p.usp) lines.push(`Unique selling point: ${p.usp}`);
    if (p.priceRange) lines.push(`Price range: ${p.priceRange}`);
    if (p.offers?.length) lines.push(`Current offers: ${p.offers.join('; ')}`);
    if (p.competitors?.length) lines.push(`Competitors: ${p.competitors.join(', ')}`);
    if (p.keywords?.length) lines.push(`Core topics/keywords: ${p.keywords.join(', ')}`);

    const products = Array.isArray(p.products) ? (p.products as Array<Record<string, unknown>>) : [];
    if (products.length) {
      const names = products
        .map((pr) => (pr?.name ? String(pr.name) : null))
        .filter(Boolean)
        .slice(0, 10);
      if (names.length) lines.push(`Products/services: ${names.join(', ')}`);
    }

    if (lines.length === 0) return '';

    return `\n\nBUSINESS CONTEXT (use this to make the content specific and on-brand):\n- ${lines.join('\n- ')}`;
  }
}
