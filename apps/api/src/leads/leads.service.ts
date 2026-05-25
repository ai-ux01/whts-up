import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async list(
    workspaceId: string,
    params: { status?: LeadStatus; search?: string; assignedTo?: string },
  ) {
    const where: Prisma.LeadWhereInput = { workspaceId };

    if (params.status) where.status = params.status;
    if (params.assignedTo) where.assignedUserId = params.assignedTo;
    if (params.search) {
      where.OR = [
        { contact: { name: { contains: params.search, mode: 'insensitive' } } },
        { contact: { phone: { contains: params.search } } },
        { notes: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.lead.findMany({
      where,
      include: {
        contact: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { lastInteractionAt: 'desc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, workspaceId },
      include: {
        contact: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(workspaceId: string, id: string, dto: {
    status?: LeadStatus;
    notes?: string;
    assignedUserId?: string | null;
    tags?: string[];
    name?: string;
  }) {
    await this.findOne(workspaceId, id);

    if (dto.name) {
      const lead = await this.prisma.lead.findUnique({ where: { id } });
      if (lead) {
        await this.prisma.contact.update({
          where: { id: lead.contactId },
          data: { name: dto.name },
        });
      }
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        assignedUserId: dto.assignedUserId,
        tags: dto.tags,
      },
      include: {
        contact: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async exportCsv(
    workspaceId: string,
    params: { status?: LeadStatus; search?: string },
    res: Response,
  ) {
    const leads = await this.list(workspaceId, params);
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const header =
      'name,phone,status,lead_source,utm_source,utm_campaign,tags,notes,assigned_to,last_interaction';
    const rows = leads.map((l) =>
      [
        l.contact.name || '',
        l.contact.phone,
        l.status,
        l.contact.leadSource || '',
        l.contact.utmSource || '',
        l.contact.utmCampaign || '',
        l.tags.join(';'),
        (l.notes || '').replace(/\n/g, ' '),
        l.assignedUser?.name || '',
        l.lastInteractionAt.toISOString(),
      ]
        .map(escape)
        .join(','),
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="leads-${Date.now()}.csv"`,
    );
    res.send([header, ...rows].join('\n'));
  }

  async upsertFromContact(
    workspaceId: string,
    contactId: string,
    opts?: { leadSource?: string | null },
  ) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });
    const tags =
      opts?.leadSource === 'meta_ads' && contact?.leadSource === 'meta_ads'
        ? ['meta_ads']
        : undefined;

    return this.prisma.lead.upsert({
      where: { contactId },
      create: {
        workspaceId,
        contactId,
        status: LeadStatus.NEW,
        lastInteractionAt: new Date(),
        tags: tags ?? [],
      },
      update: {
        lastInteractionAt: new Date(),
        ...(tags ? { tags } : {}),
      },
    });
  }
}
