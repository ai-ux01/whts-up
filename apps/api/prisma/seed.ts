import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  generateDummyData,
  getRandomMarketingData,
  VERTICAL_CONFIGS,
} from '../src/platform/utils/dummy-data-generator';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);
  const now = new Date();

  console.log('Starting fresh database seeding...');

  // 1. Provision Platform Super Admin
  await prisma.user.upsert({
    where: { email: 'superadmin@platform.com' },
    update: { role: UserRole.SUPER_ADMIN, workspaceId: null },
    create: {
      email: 'superadmin@platform.com',
      passwordHash,
      name: 'Platform Admin',
      role: UserRole.SUPER_ADMIN,
      workspaceId: null,
    },
  });
  console.log('Seeded Super Admin user: superadmin@platform.com');

  // 2. Provision Workspace 1: Real Estate (Skyline Luxury Living)
  const reConfig = VERTICAL_CONFIGS.REAL_ESTATE;
  const reMarketing = getRandomMarketingData('REAL_ESTATE');

  const reWorkspace = await prisma.workspace.upsert({
    where: { id: 'seed-workspace-real-estate' },
    update: {
      slug: 'skyline-living',
      businessName: 'Skyline Luxury Living',
      businessType: 'REAL_ESTATE',
      aiEnabled: true,
      aiSystemPrompt: reConfig.aiSystemPrompt,
      instagramUsername: reConfig.instagramUsername,
      ...reMarketing,
      updatedAt: now,
    },
    create: {
      id: 'seed-workspace-real-estate',
      name: 'Skyline Luxury Living',
      slug: 'skyline-living',
      businessName: 'Skyline Luxury Living',
      businessType: 'REAL_ESTATE',
      aiEnabled: true,
      aiSystemPrompt: reConfig.aiSystemPrompt,
      instagramUsername: reConfig.instagramUsername,
      ...reMarketing,
    },
  });

  // Admin for Real Estate
  await prisma.user.upsert({
    where: { email: 'realestate@demo.com' },
    update: { role: UserRole.ADMIN, workspaceId: reWorkspace.id },
    create: {
      email: 'realestate@demo.com',
      passwordHash,
      name: 'Real Estate Admin',
      role: UserRole.ADMIN,
      workspaceId: reWorkspace.id,
    },
  });

  // Agent for Real Estate
  await prisma.user.upsert({
    where: { email: 'agent-re@demo.com' },
    update: { role: UserRole.AGENT, workspaceId: reWorkspace.id },
    create: {
      email: 'agent-re@demo.com',
      passwordHash,
      name: 'RE Sales Agent',
      role: UserRole.AGENT,
      workspaceId: reWorkspace.id,
    },
  });

  // Generate Real Estate Mock Data
  // Clean up any existing data for this workspace first to avoid primary key collisions
  await prisma.campaignRecipient.deleteMany({ where: { campaign: { workspaceId: reWorkspace.id } } });
  await prisma.campaign.deleteMany({ where: { workspaceId: reWorkspace.id } });
  await prisma.lead.deleteMany({ where: { workspaceId: reWorkspace.id } });
  await prisma.message.deleteMany({ where: { conversation: { workspaceId: reWorkspace.id } } });
  await prisma.conversation.deleteMany({ where: { workspaceId: reWorkspace.id } });
  await prisma.contact.deleteMany({ where: { workspaceId: reWorkspace.id } });

  await generateDummyData(prisma, reWorkspace.id, 'REAL_ESTATE');
  console.log('Seeded Workspace 1: Skyline Luxury Living (Real Estate) -> realestate@demo.com');

  // 3. Provision Workspace 2: Coaching Institutes (Apex Academy)
  const coachConfig = VERTICAL_CONFIGS.COACHING;
  const coachMarketing = getRandomMarketingData('COACHING');

  const coachWorkspace = await prisma.workspace.upsert({
    where: { id: 'seed-workspace-coaching' },
    update: {
      slug: 'apex-academy',
      businessName: 'Apex Academy',
      businessType: 'COACHING',
      aiEnabled: true,
      aiSystemPrompt: coachConfig.aiSystemPrompt,
      instagramUsername: coachConfig.instagramUsername,
      ...coachMarketing,
      updatedAt: now,
    },
    create: {
      id: 'seed-workspace-coaching',
      name: 'Apex Academy',
      slug: 'apex-academy',
      businessName: 'Apex Academy',
      businessType: 'COACHING',
      aiEnabled: true,
      aiSystemPrompt: coachConfig.aiSystemPrompt,
      instagramUsername: coachConfig.instagramUsername,
      ...coachMarketing,
    },
  });

  // Admin for Coaching
  await prisma.user.upsert({
    where: { email: 'coaching@demo.com' },
    update: { role: UserRole.ADMIN, workspaceId: coachWorkspace.id },
    create: {
      email: 'coaching@demo.com',
      passwordHash,
      name: 'Apex Academy Admin',
      role: UserRole.ADMIN,
      workspaceId: coachWorkspace.id,
    },
  });

  // Agent for Coaching
  await prisma.user.upsert({
    where: { email: 'agent-coach@demo.com' },
    update: { role: UserRole.AGENT, workspaceId: coachWorkspace.id },
    create: {
      email: 'agent-coach@demo.com',
      passwordHash,
      name: 'Coach Counselor',
      role: UserRole.AGENT,
      workspaceId: coachWorkspace.id,
    },
  });

  // Generate Coaching Mock Data
  await prisma.campaignRecipient.deleteMany({ where: { campaign: { workspaceId: coachWorkspace.id } } });
  await prisma.campaign.deleteMany({ where: { workspaceId: coachWorkspace.id } });
  await prisma.lead.deleteMany({ where: { workspaceId: coachWorkspace.id } });
  await prisma.message.deleteMany({ where: { conversation: { workspaceId: coachWorkspace.id } } });
  await prisma.conversation.deleteMany({ where: { workspaceId: coachWorkspace.id } });
  await prisma.contact.deleteMany({ where: { workspaceId: coachWorkspace.id } });

  await generateDummyData(prisma, coachWorkspace.id, 'COACHING');
  console.log('Seeded Workspace 2: Apex Academy (Coaching) -> coaching@demo.com');

  console.log('\nSeed complete!');
  console.log('  Platform Super Admin:  superadmin@platform.com / password123 -> /admin/login');
  console.log('  Real Estate Admin:     realestate@demo.com / password123 -> /login');
  console.log('  Coaching Admin:        coaching@demo.com / password123 -> /login');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
