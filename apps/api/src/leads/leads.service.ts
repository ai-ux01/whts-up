import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async list(
    workspaceId: string,
    params: {
      status?: LeadStatus;
      search?: string;
      assignedTo?: string;
      tag?: string;
      campaign?: string;
      leadSource?: string;
    },
  ) {
    const where: Prisma.LeadWhereInput = { workspaceId };

    if (params.status) where.status = params.status;

    if (params.assignedTo) {
      if (params.assignedTo === 'unassigned') {
        where.assignedUserId = null;
      } else {
        where.assignedUserId = params.assignedTo;
      }
    }

    if (params.tag) {
      where.tags = { has: params.tag };
    }

    if (params.leadSource || params.campaign) {
      where.contact = {
        ...(params.leadSource ? { leadSource: params.leadSource } : {}),
        ...(params.campaign ? { utmCampaign: params.campaign } : {}),
      };
    }

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

  /**
   * Phase 4 — pipeline view: leads grouped by status for the Kanban board.
   * Columns are ordered NEW → INTERESTED → FOLLOW_UP → CLOSED.
   */
  async pipeline(workspaceId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { workspaceId },
      include: {
        contact: { select: { id: true, name: true, phone: true, leadSource: true } },
      },
      orderBy: { lastInteractionAt: 'desc' },
    });

    const columns: LeadStatus[] = [
      LeadStatus.NEW,
      LeadStatus.INTERESTED,
      LeadStatus.FOLLOW_UP,
      LeadStatus.CLOSED,
    ];

    return columns.map((status) => ({
      status,
      leads: leads
        .filter((l) => l.status === status)
        .map((l) => ({
          id: l.id,
          name: l.contact.name,
          phone: l.contact.phone,
          leadSource: l.contact.leadSource,
          tags: l.tags,
          lastInteractionAt: l.lastInteractionAt,
        })),
    }));
  }

  /**
   * Phase 4 — follow-up reminders: leads that need attention, i.e. flagged
   * FOLLOW_UP with no interaction in the last 24h, oldest first.
   */
  async followUps(workspaceId: string) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const leads = await this.prisma.lead.findMany({
      where: {
        workspaceId,
        status: LeadStatus.FOLLOW_UP,
        lastInteractionAt: { lte: cutoff },
      },
      include: {
        contact: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { lastInteractionAt: 'asc' },
    });

    return leads.map((l) => ({
      id: l.id,
      name: l.contact.name,
      phone: l.contact.phone,
      notes: l.notes,
      lastInteractionAt: l.lastInteractionAt,
      overdueDays: Math.floor(
        (Date.now() - l.lastInteractionAt.getTime()) / (24 * 60 * 60 * 1000),
      ),
    }));
  }

  async update(workspaceId: string, id: string, dto: {
    status?: LeadStatus;
    notes?: string;
    assignedUserId?: string | null;
    tags?: string[];
    name?: string;
    value?: number;
  }) {
    const current = await this.findOne(workspaceId, id);

    if (dto.name) {
      const lead = await this.prisma.lead.findUnique({ where: { id } });
      if (lead) {
        await this.prisma.contact.update({
          where: { id: lead.contactId },
          data: { name: dto.name },
        });
      }
    }

    // Revenue attribution: set/clear wonAt when moving in/out of CLOSED.
    let wonAt: Date | null | undefined;
    if (dto.status === LeadStatus.CLOSED && current.status !== LeadStatus.CLOSED) {
      wonAt = new Date();
    } else if (dto.status && dto.status !== LeadStatus.CLOSED && current.status === LeadStatus.CLOSED) {
      wonAt = null;
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        assignedUserId: dto.assignedUserId,
        tags: dto.tags,
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(wonAt !== undefined ? { wonAt } : {}),
      },
      include: {
        contact: true,
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async exportCsv(
    workspaceId: string,
    params: {
      status?: LeadStatus;
      search?: string;
      assignedTo?: string;
      tag?: string;
      campaign?: string;
      leadSource?: string;
    },
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
