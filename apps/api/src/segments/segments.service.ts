import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SegmentFilters {
  status?: string;
  tags?: string[];
  leadSource?: string;
}

@Injectable()
export class SegmentsService {
  constructor(private prisma: PrismaService) {}

  async list(workspaceId: string) {
    return this.prisma.segment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const segment = await this.prisma.segment.findFirst({
      where: { id, workspaceId },
    });
    if (!segment) throw new NotFoundException('Segment not found');
    return segment;
  }

  async create(workspaceId: string, dto: { name: string; filters: SegmentFilters }) {
    return this.prisma.segment.create({
      data: {
        workspaceId,
        name: dto.name,
        filters: dto.filters as any,
      },
    });
  }

  async delete(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    return this.prisma.segment.delete({
      where: { id },
    });
  }

  async resolveSegmentContacts(workspaceId: string, segmentId: string) {
    const segment = await this.findOne(workspaceId, segmentId);
    const filters = segment.filters as unknown as SegmentFilters;
    return this.buildPrismaQuery(workspaceId, filters);
  }

  async previewSegmentCount(workspaceId: string, filters: SegmentFilters) {
    const contacts = await this.buildPrismaQuery(workspaceId, filters);
    return { count: contacts.length };
  }

  private async buildPrismaQuery(workspaceId: string, filters: SegmentFilters) {
    const where: any = { workspaceId };

    if (filters.leadSource) {
      where.leadSource = filters.leadSource;
    }

    if (filters.status || (filters.tags && filters.tags.length > 0)) {
      where.lead = {};
      if (filters.status) {
        where.lead.status = filters.status;
      }
      if (filters.tags && filters.tags.length > 0) {
        where.lead.tags = { hasSome: filters.tags };
      }
    }

    return this.prisma.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });
  }
}
