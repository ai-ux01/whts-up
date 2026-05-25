import { Injectable } from '@nestjs/common';
import { MessageSender } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(workspaceId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLeads,
      activeConversations,
      todayMessages,
      aiReplies,
      campaigns,
      leadsByStatus,
      messagesPerDay,
      leadsBySource,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { workspaceId } }),
      this.prisma.conversation.count({
        where: {
          workspaceId,
          lastMessageAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.message.count({
        where: {
          conversation: { workspaceId },
          createdAt: { gte: today },
        },
      }),
      this.prisma.message.count({
        where: {
          conversation: { workspaceId },
          sender: MessageSender.AI,
          createdAt: { gte: today },
        },
      }),
      this.prisma.campaign.findMany({
        where: { workspaceId },
        include: {
          _count: { select: { recipients: true } },
          recipients: {
            where: { status: { in: ['SENT', 'DELIVERED'] } },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: true,
      }),
      this.getMessagesPerDay(workspaceId),
      this.prisma.contact.groupBy({
        by: ['leadSource'],
        where: { workspaceId, leadSource: { not: null } },
        _count: true,
      }),
    ]);

    const broadcastStats = {
      totalCampaigns: campaigns.length,
      recentCampaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        totalRecipients: c._count.recipients,
        sentCount: c.recipients.length,
      })),
    };

    return {
      totalLeads,
      activeConversations,
      todayMessages,
      aiRepliesCount: aiReplies,
      broadcastStats,
      leadsByStatus: leadsByStatus.map((l) => ({
        status: l.status,
        count: l._count,
      })),
      messagesPerDay,
      leadsBySource: leadsBySource.map((s) => ({
        source: s.leadSource ?? 'unknown',
        count: s._count,
      })),
    };
  }

  private async getMessagesPerDay(workspaceId: string) {
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);

      const count = await this.prisma.message.count({
        where: {
          conversation: { workspaceId },
          createdAt: { gte: date, lt: next },
        },
      });

      days.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }
    return days;
  }
}
