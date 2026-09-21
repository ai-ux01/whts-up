import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { BusinessProfileService } from './business-profile.service';
import { QueueService } from '../queue/queue.service';

export interface GenerateCampaignInput {
  topic: string;
  objective?: string; // e.g. "Generate WhatsApp Leads"
}

export interface CampaignBundle {
  topic: string;
  objective: string;
  strategy: string;
  reel: { title: string; hook: string; scenes: string[] };
  instagramPost: { caption: string; hashtags: string[] };
  facebookPost: { caption: string };
  adCopy: { headline: string; primaryText: string; cta: string };
  whatsappMessage: string;
  followUps: string[];
  landingCopy: string;
  generatedByAi: boolean;
}

/**
 * Phase 3 — Campaign Engine.
 * Turns a single opportunity into a full, reviewable campaign bundle by
 * chaining the AI with the Marketing Brain + Brand Kit as context.
 * Nothing is published here — the user reviews the bundle, then materializes
 * the parts they want via `materialize()`.
 */
@Injectable()
export class CampaignEngineService {
  private readonly logger = new Logger(CampaignEngineService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private businessProfile: BusinessProfileService,
    @Inject(forwardRef(() => QueueService))
    private queue: QueueService,
  ) {}

  async generate(workspaceId: string, input: GenerateCampaignInput): Promise<CampaignBundle> {
    const objective = input.objective?.trim() || 'Generate WhatsApp Leads';
    const brandKit = await this.prisma.brandKit.findUnique({ where: { workspaceId } });
    const cta = brandKit?.ctaTemplate || "DM us 'START' to learn more!";
    const voice = brandKit?.brandVoice || 'Professional';
    const context = await this.businessProfile.buildContext(workspaceId);

    const client = this.aiService.getClient();
    if (!client) {
      return this.mockBundle(input.topic, objective, cta);
    }

    const prompt = `You are a senior performance-marketing strategist for Indian SMBs.
Create a complete, launch-ready marketing campaign for this opportunity: "${input.topic}".
Campaign objective: ${objective}.
Brand voice: ${voice}. Signature CTA: "${cta}".
Write in natural Hinglish (Roman script) where it fits the audience.${context}

Return STRICT valid JSON with exactly this schema:
{
  "strategy": "2-3 sentence campaign strategy",
  "reel": { "title": "string", "hook": "string", "scenes": ["scene 1 narration", "scene 2", "scene 3", "scene 4"] },
  "instagramPost": { "caption": "string", "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"] },
  "facebookPost": { "caption": "string" },
  "adCopy": { "headline": "string", "primaryText": "string", "cta": "string" },
  "whatsappMessage": "first-touch WhatsApp message",
  "followUps": ["follow-up 1 (day 2)", "follow-up 2 (day 4)", "follow-up 3 (day 7)"],
  "landingCopy": "short landing-page hero copy"
}`;

    try {
      const completion = await client.chat.completions.create({
        model: this.aiService.getChatModel(),
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return this.normalize(parsed, input.topic, objective, cta, true);
    } catch (err) {
      this.logger.error(`Campaign generation failed: ${(err as Error).message}`);
      return this.mockBundle(input.topic, objective, cta);
    }
  }

  /**
   * Materialize selected parts of a reviewed bundle into real records:
   *  - reel  -> a ReelProject (DRAFT) with scenes
   *  - post  -> a SocialPost (DRAFT) from the Instagram content
   *  - whatsappCampaign -> a Campaign (DRAFT) with the WhatsApp body
   * Returns the ids of what was created. Nothing is sent/published.
   */
  async materialize(
    workspaceId: string,
    bundle: CampaignBundle,
    parts: { reel?: boolean; post?: boolean; whatsappCampaign?: boolean },
  ) {
    const created: { reelId?: string; socialPostId?: string; campaignId?: string } = {};

    if (parts.reel && bundle.reel) {
      const project = await this.prisma.reelProject.create({
        data: {
          workspaceId,
          title: bundle.reel.title || bundle.topic,
          niche: bundle.objective,
          offer: bundle.topic,
          script: bundle.reel.hook,
          status: 'DRAFT',
          scenes: {
            create: (bundle.reel.scenes || []).map((text, i) => ({
              sceneNumber: i + 1,
              text,
              duration: 5,
              transition: 'fade',
            })),
          },
        },
      });
      created.reelId = project.id;
    }

    if (parts.post && bundle.instagramPost) {
      const post = await this.prisma.socialPost.create({
        data: {
          workspaceId,
          caption: bundle.instagramPost.caption,
          hashtags: bundle.instagramPost.hashtags || [],
          platforms: ['instagram_post'],
          status: 'DRAFT',
        },
      });
      created.socialPostId = post.id;
    }

    if (parts.whatsappCampaign && bundle.whatsappMessage) {
      const campaign = await this.prisma.campaign.create({
        data: {
          workspaceId,
          name: `${bundle.topic} — WhatsApp`,
          channel: 'WHATSAPP',
          body: bundle.whatsappMessage,
          status: 'DRAFT',
        },
      });
      created.campaignId = campaign.id;
    }

    return { success: true, created };
  }

  /**
   * ONE-CLICK LAUNCH — the fully-automated path. From a reviewed bundle it:
   *  1. schedules the Instagram/Facebook post to the calendar (auto-publishes at time)
   *  2. creates a reel project and enqueues the render pipeline
   *  3. creates a WhatsApp campaign, loads ALL workspace contacts as recipients,
   *     and enqueues it to send
   * Each step is best-effort and reported back; a failure in one does not abort
   * the others. Nothing here is irreversible beyond the WhatsApp send (which is
   * the point of "launch").
   */
  async launch(
    workspaceId: string,
    bundle: CampaignBundle,
    opts?: { scheduleAt?: string },
  ) {
    const steps: Record<string, { status: 'done' | 'skipped' | 'failed'; detail?: string; id?: string }> = {};

    // 1) Schedule the social post.
    try {
      const when = opts?.scheduleAt ? new Date(opts.scheduleAt) : this.tomorrowAt10();
      const post = await this.prisma.scheduledPost.create({
        data: {
          workspaceId,
          title: bundle.topic.slice(0, 80),
          content: bundle.instagramPost.caption || bundle.facebookPost.caption || bundle.topic,
          scheduledAt: when,
          status: 'PENDING',
          platform: 'BOTH',
        },
      });
      // Mirror as a SocialPost so it shows in the content library too.
      await this.prisma.socialPost.create({
        data: {
          workspaceId,
          caption: bundle.instagramPost.caption || '',
          hashtags: bundle.instagramPost.hashtags || [],
          platforms: ['instagram_post', 'facebook_post'],
          status: 'SCHEDULED',
          scheduledAt: when,
        },
      });
      steps.post = { status: 'done', id: post.id, detail: `Scheduled for ${when.toISOString()}` };
    } catch (err) {
      steps.post = { status: 'failed', detail: (err as Error).message };
    }

    // 2) Reel project + render.
    try {
      const reel = await this.prisma.reelProject.create({
        data: {
          workspaceId,
          title: bundle.reel.title || bundle.topic,
          niche: bundle.objective,
          offer: bundle.topic,
          script: bundle.reel.hook,
          status: 'DRAFT',
          scenes: {
            create: (bundle.reel.scenes || []).map((text, i) => ({
              sceneNumber: i + 1,
              text,
              duration: 5,
              transition: 'fade',
            })),
          },
        },
      });
      await this.queue.enqueueReelRender(reel.id);
      steps.reel = { status: 'done', id: reel.id, detail: 'Render queued' };
    } catch (err) {
      steps.reel = { status: 'failed', detail: (err as Error).message };
    }

    // 3) WhatsApp campaign → load all contacts → send.
    try {
      const contacts = await this.prisma.contact.findMany({
        where: { workspaceId },
        select: { phone: true, name: true },
      });
      if (contacts.length === 0) {
        steps.whatsapp = { status: 'skipped', detail: 'No contacts to message.' };
      } else {
        const campaign = await this.prisma.campaign.create({
          data: {
            workspaceId,
            name: `${bundle.topic} — WhatsApp`,
            channel: 'WHATSAPP',
            body: bundle.whatsappMessage,
            status: 'SCHEDULED',
            scheduledAt: new Date(),
            recipients: {
              create: contacts.map((c) => ({
                phone: c.phone,
                name: c.name,
                status: 'PENDING' as const,
              })),
            },
          },
        });
        await this.queue.enqueueCampaign(campaign.id, false);
        steps.whatsapp = {
          status: 'done',
          id: campaign.id,
          detail: `Sending to ${contacts.length} contact(s)`,
        };
      }
    } catch (err) {
      steps.whatsapp = { status: 'failed', detail: (err as Error).message };
    }

    const launched = Object.values(steps).filter((s) => s.status === 'done').length;

    // Persist the launch as a single unit so the Launch tab can show only
    // launched-campaign data (what was launched + the per-step outcome).
    let launchId: string | undefined;
    try {
      const record = await this.prisma.launchedCampaign.create({
        data: {
          workspaceId,
          topic: bundle.topic,
          objective: bundle.objective,
          launched,
          steps,
          postId: steps.post?.id,
          reelId: steps.reel?.id,
          campaignId: steps.whatsapp?.id,
        },
      });
      launchId = record.id;
    } catch (err) {
      this.logger.error('Failed to persist LaunchedCampaign', err as Error);
    }

    return { success: launched > 0, launched, steps, launchId };
  }

  /** List launched campaigns (most recent first) for the Launch tab. */
  async listLaunches(workspaceId: string) {
    return this.prisma.launchedCampaign.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private tomorrowAt10(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  }

  private normalize(
    raw: Record<string, unknown>,
    topic: string,
    objective: string,
    cta: string,
    generatedByAi: boolean,
  ): CampaignBundle {
    const asObj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
    const asStrArr = (v: unknown) =>
      Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
    const reel = asObj(raw.reel);
    const ig = asObj(raw.instagramPost);
    const fb = asObj(raw.facebookPost);
    const ad = asObj(raw.adCopy);

    return {
      topic,
      objective,
      strategy: String(raw.strategy || ''),
      reel: {
        title: String(reel.title || topic),
        hook: String(reel.hook || ''),
        scenes: asStrArr(reel.scenes),
      },
      instagramPost: {
        caption: String(ig.caption || ''),
        hashtags: asStrArr(ig.hashtags),
      },
      facebookPost: { caption: String(fb.caption || '') },
      adCopy: {
        headline: String(ad.headline || ''),
        primaryText: String(ad.primaryText || ''),
        cta: String(ad.cta || cta),
      },
      whatsappMessage: String(raw.whatsappMessage || ''),
      followUps: asStrArr(raw.followUps),
      landingCopy: String(raw.landingCopy || ''),
      generatedByAi,
    };
  }

  private mockBundle(topic: string, objective: string, cta: string): CampaignBundle {
    return {
      topic,
      objective,
      strategy: `Run a lead-focused ${objective} campaign around "${topic}", combining a short vertical reel, organic posts, a paid ad, and a WhatsApp first-touch with a 3-step follow-up.`,
      reel: {
        title: `${topic} — 30s Reel`,
        hook: `Stop scrolling! Yeh ${topic} aapke liye hi hai 👇`,
        scenes: [
          `Hook: "${topic}" ka sabse bada fayda dikhaao.`,
          'Problem: customer ki common problem highlight karo.',
          'Solution: aapka offer / USP dikhaao.',
          `CTA: ${cta}`,
        ],
      },
      instagramPost: {
        caption: `${topic} 🚀\n\nAaj hi jaaniye kaise aap fayda utha sakte hain.\n\n${cta}`,
        hashtags: ['#India', '#SMB', '#Marketing', '#Offer', '#Local'],
      },
      facebookPost: {
        caption: `${topic} — limited-time opportunity. ${cta}`,
      },
      adCopy: {
        headline: `${topic}`,
        primaryText: `Looking for ${topic}? We make it simple. ${cta}`,
        cta: 'Send Message',
      },
      whatsappMessage: `Namaste 🙏 Aap "${topic}" me interested hain? Reply 'YES' aur hum aapko turant details bhejte hain.`,
      followUps: [
        `Day 2: Just following up on "${topic}" — koi sawaal ho toh poochhiye!`,
        'Day 4: Sharing a quick example + pricing so you can decide.',
        'Day 7: Last reminder — the current offer ends soon.',
      ],
      landingCopy: `${topic} — get started in minutes. ${cta}`,
      generatedByAi: false,
    };
  }
}
