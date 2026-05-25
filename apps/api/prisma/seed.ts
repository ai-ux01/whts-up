import {
  LeadStatus,
  MessageSender,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/** Demo marketing account IDs (not real — for UI/dashboard testing). */
const MARKETING = {
  metaAdsAccountId: 'act_1283746501234567',
  metaPageId: '8844221100998877',
  metaBusinessId: '5566778899001122',
  googleAdsCustomerId: '123-456-7890',
  facebookPixelId: '987654321098765',
  instagramUsername: 'demobusinessindia',
  defaultUtmSource: 'whatsapp',
};

type SeedLead = {
  phone: string;
  name: string;
  leadSource: string;
  utmSource: string;
  utmMedium?: string;
  utmCampaign?: string;
  status: LeadStatus;
  tags: string[];
  notes: string;
  lastMessage: string;
  sender: MessageSender;
};

const SEED_LEADS: SeedLead[] = [
  {
    phone: '+919999575357',
    name: 'Rahul (Meta Ads)',
    leadSource: 'meta_ads',
    utmSource: 'meta',
    utmMedium: 'cpc',
    utmCampaign: 'click_to_whatsapp_summer',
    status: LeadStatus.INTERESTED,
    tags: ['meta_ads', 'pricing'],
    notes: 'Clicked Click-to-WhatsApp ad — asked pricing',
    lastMessage: 'Price kya hai?',
    sender: MessageSender.CONTACT,
  },
  {
    phone: '+919873478572',
    name: 'Priya (Google Ads)',
    leadSource: 'google_ads',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'brand_search_mumbai',
    status: LeadStatus.NEW,
    tags: ['google_ads'],
    notes: 'Landed from Google ad with UTM',
    lastMessage: 'Hello, I saw your ad on Google',
    sender: MessageSender.CONTACT,
  },
  {
    phone: '+9198888777666',
    name: 'Amit (Meta Page)',
    leadSource: 'meta_organic',
    utmSource: 'meta',
    utmMedium: 'social',
    utmCampaign: 'facebook_page_dm',
    status: LeadStatus.FOLLOW_UP,
    tags: ['meta_organic'],
    notes: 'Messaged from Facebook Page (organic)',
    lastMessage: 'Is demo available this week?',
    sender: MessageSender.CONTACT,
  },
  {
    phone: '+9197777666555',
    name: 'Sneha (WhatsApp organic)',
    leadSource: 'whatsapp',
    utmSource: 'whatsapp',
    utmMedium: 'organic',
    status: LeadStatus.NEW,
    tags: ['organic'],
    notes: 'Saved contact and messaged directly',
    lastMessage: 'Hi, need more info',
    sender: MessageSender.CONTACT,
  },
  {
    phone: '+9196666555444',
    name: 'Vikram (Campaign)',
    leadSource: 'campaign',
    utmSource: 'whatsapp',
    utmMedium: 'broadcast',
    utmCampaign: 'hello_world_may',
    status: LeadStatus.CLOSED,
    tags: ['campaign', 'template'],
    notes: 'Received hello_world broadcast template',
    lastMessage: 'Thanks for the message',
    sender: MessageSender.CONTACT,
  },
];

async function seedLead(workspaceId: string, lead: SeedLead, index: number) {
  const contact = await prisma.contact.upsert({
    where: {
      workspaceId_phone: { workspaceId, phone: lead.phone },
    },
    update: {
      name: lead.name,
      leadSource: lead.leadSource,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium ?? null,
      utmCampaign: lead.utmCampaign ?? null,
    },
    create: {
      workspaceId,
      phone: lead.phone,
      name: lead.name,
      leadSource: lead.leadSource,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium ?? null,
      utmCampaign: lead.utmCampaign ?? null,
    },
  });

  const conversationId = `seed-conv-${index}`;
  const conversation = await prisma.conversation.upsert({
    where: { id: conversationId },
    update: {
      contactId: contact.id,
      lastMessageAt: new Date(),
      lastSender: lead.sender,
      unreadCount: lead.status === LeadStatus.CLOSED ? 0 : 1,
    },
    create: {
      id: conversationId,
      workspaceId,
      contactId: contact.id,
      lastMessageAt: new Date(),
      lastSender: lead.sender,
      unreadCount: lead.status === LeadStatus.CLOSED ? 0 : 1,
    },
  });

  await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        sender: lead.sender,
        content: lead.lastMessage,
        type: 'TEXT',
      },
      ...(lead.leadSource === 'meta_ads' && index === 0
        ? [
            {
              conversationId: conversation.id,
              sender: MessageSender.AI,
              content:
                'Sir pricing ₹25,000 se start hoti hai. Demo schedule karu?',
              type: 'TEXT' as const,
            },
          ]
        : []),
    ],
  });

  await prisma.lead.upsert({
    where: { contactId: contact.id },
    update: {
      status: lead.status,
      tags: lead.tags,
      notes: lead.notes,
      lastInteractionAt: new Date(),
    },
    create: {
      workspaceId,
      contactId: contact.id,
      status: lead.status,
      tags: lead.tags,
      notes: lead.notes,
      lastInteractionAt: new Date(),
    },
  });

  return contact;
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);
  const now = new Date();

  const workspace = await prisma.workspace.upsert({
    where: { id: 'seed-workspace' },
    update: {
      slug: 'demo-business',
      webhookVerifyToken: 'your-webhook-verify-token',
      whatsappPhoneNumberId: '1083340831535489',
      ...MARKETING,
      metaBusinessId: MARKETING.metaBusinessId,
      metaConnectedAt: now,
      googleConnectedAt: now,
      businessName: 'Demo Business India',
      aiEnabled: true,
      aiSystemPrompt:
        'You are a sales assistant for Demo Business India. Reply in Hinglish when customer uses Hindi. Pricing starts at ₹25,000. Offer to schedule a demo.',
    },
    create: {
      id: 'seed-workspace',
      name: 'Demo Business',
      slug: 'demo-business',
      businessName: 'Demo Business India',
      whatsappPhoneNumberId: '1083340831535489',
      webhookVerifyToken: 'your-webhook-verify-token',
      ...MARKETING,
      metaBusinessId: MARKETING.metaBusinessId,
      metaConnectedAt: now,
      googleConnectedAt: now,
      aiEnabled: true,
      aiSystemPrompt:
        'You are a sales assistant for Demo Business India. Reply in Hinglish when customer uses Hindi. Pricing starts at ₹25,000. Offer to schedule a demo.',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { role: UserRole.ADMIN, workspaceId: workspace.id },
    create: {
      email: 'admin@demo.com',
      passwordHash,
      name: 'Admin User',
      role: UserRole.ADMIN,
      workspaceId: workspace.id,
    },
  });

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

  await prisma.user.upsert({
    where: { email: 'agent@demo.com' },
    update: {},
    create: {
      email: 'agent@demo.com',
      passwordHash,
      name: 'Agent User',
      role: UserRole.AGENT,
      workspaceId: workspace.id,
    },
  });

  for (let i = 0; i < SEED_LEADS.length; i++) {
    await seedLead(workspace.id, SEED_LEADS[i], i);
  }

  console.log('Seed complete:');
  console.log('  Client: admin@demo.com / password123 → /login');
  console.log('  Platform: superadmin@platform.com / password123 → /admin/login');
  console.log('');
  console.log('  Marketing accounts (dummy IDs on workspace):');
  console.log(`    WhatsApp Phone ID: ${workspace.whatsappPhoneNumberId}`);
  console.log(`    Meta Ads:          ${MARKETING.metaAdsAccountId}`);
  console.log(`    Facebook Page:     ${MARKETING.metaPageId}`);
  console.log(`    Google Ads:        ${MARKETING.googleAdsCustomerId}`);
  console.log(`    Meta Pixel:        ${MARKETING.facebookPixelId}`);
  console.log(`    Instagram:         @${MARKETING.instagramUsername}`);
  console.log('');
  console.log('  Sample leads by source:');
  for (const l of SEED_LEADS) {
    console.log(`    ${l.leadSource.padEnd(14)} ${l.phone} — ${l.name}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
