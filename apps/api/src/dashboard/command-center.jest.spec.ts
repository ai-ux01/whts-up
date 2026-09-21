import { Test } from '@nestjs/testing';
import { CommandCenterService } from './command-center.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Unit test with a mocked Prisma. Verifies the Command Center aggregates KPIs
 * and derives Today's Actions from state (no real DB).
 */
describe('CommandCenterService', () => {
  let service: CommandCenterService;

  const prismaMock = {
    lead: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    conversation: { count: jest.fn() },
    socialPost: { count: jest.fn() },
    scheduledPost: { count: jest.fn() },
    campaign: { findMany: jest.fn() },
    improvementSuggestion: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommandCenterService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(CommandCenterService);
  });

  it('builds KPIs and follow-up + unreplied actions from state', async () => {
    // lead.count is called for: newLeadsThisMonth, totalLeads, staleFollowUps
    prismaMock.lead.count
      .mockResolvedValueOnce(5) // new leads this month
      .mockResolvedValueOnce(20) // total leads
      .mockResolvedValueOnce(3); // stale follow-ups
    prismaMock.conversation.count
      .mockResolvedValueOnce(7) // whatsapp today
      .mockResolvedValueOnce(2); // unreplied (lastSender=CONTACT)
    prismaMock.socialPost.count.mockResolvedValueOnce(1); // drafts
    prismaMock.scheduledPost.count.mockResolvedValueOnce(0); // due
    prismaMock.lead.groupBy.mockResolvedValueOnce([
      { status: 'INTERESTED', _count: 4 },
      { status: 'CLOSED', _count: 6 },
    ]);
    prismaMock.campaign.findMany.mockResolvedValueOnce([]);
    prismaMock.improvementSuggestion.findMany.mockResolvedValueOnce([]);

    const result = await service.getOverview('ws-1');

    expect(result.kpis.newLeads.value).toBe(5);
    expect(result.kpis.whatsappConversations.value).toBe(7);
    expect(result.kpis.interestedLeads.value).toBe(4);
    expect(result.kpis.closedLeads.value).toBe(6);
    expect(result.pipeline.total).toBe(20);

    const ids = result.actions.map((a) => a.id);
    expect(ids).toContain('unreplied-conversations');
    expect(ids).toContain('stale-followups');
    expect(ids).toContain('draft-posts');
    // 0 due scheduled posts -> no such action
    expect(ids).not.toContain('scheduled-due');
  });

  it('shows an all-clear action when nothing is pending', async () => {
    prismaMock.lead.count.mockResolvedValue(0);
    prismaMock.conversation.count.mockResolvedValue(0);
    prismaMock.socialPost.count.mockResolvedValue(0);
    prismaMock.scheduledPost.count.mockResolvedValue(0);
    prismaMock.lead.groupBy.mockResolvedValue([]);
    prismaMock.campaign.findMany.mockResolvedValue([]);
    prismaMock.improvementSuggestion.findMany.mockResolvedValue([]);

    const result = await service.getOverview('ws-1');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].id).toBe('all-clear');
  });
});
