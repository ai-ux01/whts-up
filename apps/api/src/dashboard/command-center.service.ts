import { Injectable, Logger } from '@nestjs/common';
import { LeadStatus, MessageSender } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type CommandCenterAction = {
  id: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  detail?: string;
  cta: { label: string; href: string };
  count?: number;
};

/**
 * Phase 1 — Command Center.
 * Aggregates data that ALREADY exists across modules into a single
 * "what's happening + what should I do today" view. Everything here is derived
 * from real DB state; no fabricated numbers.
 */
@Injectable()
export class CommandCenterService {
  private readonly logger = new Logger(CommandCenterService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Existing AI improvement suggestions (competitor/reputation engine), read
   * from cache only — we never trigger expensive AI generation on a dashboard
   * load. Surfaced as lightweight recommendation cards.
   */
  private async getRecommendations(workspaceId: string) {
    const suggestions = await this.prisma.improvementSuggestion.findMany({
      where: { businessId: workspaceId },
      orderBy: { impactScore: 'desc' },
      take: 3,
    });
    return suggestions.map((s) => ({
      id: s.id,
      title: s.suggestion.length > 120 ? `${s.suggestion.slice(0, 117)}…` : s.suggestion,
      category: s.category,
      priority: s.priority,
      impactScore: s.impactScore,
    }));
  }

  async getOverview(workspaceId: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const followUpCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      newLeadsThisMonth,
      totalLeads,
      whatsappConversationsToday,
      leadsByStatus,
      draftPosts,
      scheduledDuePosts,
      staleFollowUps,
      unrepliedConversations,
      recentCampaigns,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: { workspaceId, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.lead.count({ where: { workspaceId } }),
      this.prisma.conversation.count({
        where: {
          workspaceId,
          channel: 'WHATSAPP',
          lastMessageAt: { gte: startOfToday },
        },
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: true,
      }),
      this.prisma.socialPost.count({
        where: { workspaceId, status: 'DRAFT' },
      }),
      this.prisma.scheduledPost.count({
        where: { workspaceId, status: 'PENDING', scheduledAt: { lte: now } },
      }),
      // Leads flagged FOLLOW_UP whose last interaction is older than 24h.
      this.prisma.lead.count({
        where: {
          workspaceId,
          status: LeadStatus.FOLLOW_UP,
          lastInteractionAt: { lte: followUpCutoff },
        },
      }),
      // Conversations where the contact spoke last (awaiting our reply).
      this.prisma.conversation.count({
        where: { workspaceId, lastSender: MessageSender.CONTACT },
      }),
      this.prisma.campaign.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, status: true, channel: true, createdAt: true },
      }),
    ]);

    const statusMap = Object.fromEntries(
      leadsByStatus.map((s) => [s.status, s._count]),
    ) as Record<string, number>;

    const kpis = {
      newLeads: { value: newLeadsThisMonth, period: 'this month' },
      whatsappConversations: { value: whatsappConversationsToday, period: 'today' },
      interestedLeads: { value: statusMap[LeadStatus.INTERESTED] ?? 0, period: 'current' },
      closedLeads: { value: statusMap[LeadStatus.CLOSED] ?? 0, period: 'all time' },
    };

    const actions = this.buildActions({
      unrepliedConversations,
      staleFollowUps,
      draftPosts,
      scheduledDuePosts,
    });

    const recommendations = await this.getRecommendations(workspaceId);

    return {
      greetingDate: now.toISOString(),
      kpis,
      pipeline: {
        new: statusMap[LeadStatus.NEW] ?? 0,
        interested: statusMap[LeadStatus.INTERESTED] ?? 0,
        followUp: statusMap[LeadStatus.FOLLOW_UP] ?? 0,
        closed: statusMap[LeadStatus.CLOSED] ?? 0,
        total: totalLeads,
      },
      actions,
      recommendations,
      recentCampaigns,
    };
  }

  /** Derive today's actionable items from real state (no manual to-do list). */
  private buildActions(input: {
    unrepliedConversations: number;
    staleFollowUps: number;
    draftPosts: number;
    scheduledDuePosts: number;
  }): CommandCenterAction[] {
    const actions: CommandCenterAction[] = [];

    if (input.unrepliedConversations > 0) {
      actions.push({
        id: 'unreplied-conversations',
        severity: 'high',
        title: `${input.unrepliedConversations} conversation${input.unrepliedConversations > 1 ? 's' : ''} awaiting your reply`,
        detail: 'Customers messaged last — reply within the 24h window.',
        cta: { label: 'Open Inbox', href: '/inbox' },
        count: input.unrepliedConversations,
      });
    }

    if (input.staleFollowUps > 0) {
      const plural = input.staleFollowUps > 1;
      actions.push({
        id: 'stale-followups',
        severity: 'high',
        title: `${input.staleFollowUps} lead${plural ? 's' : ''} ${plural ? 'need' : 'needs'} follow-up`,
        detail: 'Marked for follow-up with no interaction in over 24 hours.',
        cta: { label: 'View Leads', href: '/leads' },
        count: input.staleFollowUps,
      });
    }

    if (input.scheduledDuePosts > 0) {
      actions.push({
        id: 'scheduled-due',
        severity: 'medium',
        title: `${input.scheduledDuePosts} scheduled post${input.scheduledDuePosts > 1 ? 's' : ''} due to publish`,
        cta: { label: 'Open Calendar', href: '/content-calendar' },
        count: input.scheduledDuePosts,
      });
    }

    if (input.draftPosts > 0) {
      actions.push({
        id: 'draft-posts',
        severity: 'low',
        title: `${input.draftPosts} draft${input.draftPosts > 1 ? 's' : ''} ready to review`,
        cta: { label: 'Review Drafts', href: '/content-calendar' },
        count: input.draftPosts,
      });
    }

    if (actions.length === 0) {
      actions.push({
        id: 'all-clear',
        severity: 'info',
        title: "You're all caught up 🎉",
        detail: 'No pending follow-ups or drafts. Create something new.',
        cta: { label: 'Create Content', href: '/content-studio' },
      });
    }

    return actions;
  }
}
