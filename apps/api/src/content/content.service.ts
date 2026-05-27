import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { SecretsCryptoService } from '../crypto/secrets-crypto.service';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private secretsCrypto: SecretsCryptoService
  ) {}

  // ==========================================
  // BRAND KIT METHODS
  // ==========================================

  async getBrandKit(workspaceId: string) {
    let kit = await this.prisma.brandKit.findUnique({
      where: { workspaceId },
    });

    if (!kit) {
      kit = await this.prisma.brandKit.create({
        data: {
          workspaceId,
          primaryColor: '#16a34a',
          secondaryColor: '#14532d',
          fontFamily: 'Inter',
          brandVoice: 'Professional',
          ctaTemplate: "DM us 'START' to learn more!",
        },
      });
    }
    return kit;
  }

  async updateBrandKit(workspaceId: string, data: any) {
    const kit = await this.getBrandKit(workspaceId);
    return this.prisma.brandKit.update({
      where: { id: kit.id },
      data: {
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor || '#16a34a',
        secondaryColor: data.secondaryColor || '#14532d',
        fontFamily: data.fontFamily || 'Inter',
        brandVoice: data.brandVoice || 'Professional',
        ctaTemplate: data.ctaTemplate || "DM us 'START' to learn more!",
      },
    });
  }

  // ==========================================
  // AI CONTENT STUDIO METHODS
  // ==========================================

  async generateContent(workspaceId: string, params: {
    type: string; // caption, ad_copy, hashtags, cta, carousel_outline
    topic: string;
    tone?: string;
    language?: string; // English, Hindi, Hinglish
  }) {
    const brandKit = await this.getBrandKit(workspaceId);
    const voice = params.tone || brandKit.brandVoice || 'Professional';
    const lang = params.language || 'Hinglish';
    const cta = brandKit.ctaTemplate || '';

    const client = this.aiService.getClient();
    const model = this.aiService.getChatModel();

    let systemPrompt = `You are an elite, highly experienced copywriter and SaaS content strategist specializing in Indian SMB marketing.
Your goal is to write high-impact content that triggers action and generates direct sales.
Current Brand Voice Profile: ${voice}
Current Signature Call-to-Action (CTA): ${cta}
Language criteria: Write entirely in ${lang}. If Hinglish, write casual conversational Hindi in Roman script (e.g. "Kya aap ready hain?").`;

    let userPrompt = '';
    if (params.type === 'caption') {
      userPrompt = `Write a viral social media caption for topic: "${params.topic}". 
Structure:
- 1 attention-grabbing Hook
- 3 bullet points with high-value body information
- 1 clear call to action (custom brand CTA: "${cta}")
- 5 relevant trending hashtags`;
    } else if (params.type === 'ad_copy') {
      userPrompt = `Write Facebook/Instagram ad copy for: "${params.topic}".
Use the AIDA framework:
- Attention (Hook)
- Interest (Problem details)
- Desire (Our offer/solution benefits)
- Action (CTA: "${cta}")
Keep it highly conversion-focused.`;
    } else if (params.type === 'hashtags') {
      userPrompt = `Generate 25 niche-specific, high-volume social media hashtags matching the topic: "${params.topic}". Categorize them into High (5), Medium (10), and Low (10) search volumes.`;
    } else if (params.type === 'cta') {
      userPrompt = `Generate 5 creative, high-converting CTA (Call to Action) taglines for: "${params.topic}". Keep them short and optimized for WhatsApp triggers (e.g. "Message 'DEAL' to get yours!").`;
    } else {
      userPrompt = `Create a complete multi-slide Carousel Post structure for Instagram regarding the topic: "${params.topic}". 
Provide:
- Slide 1: Hook Headline & Visual Description
- Slide 2: The Main Problem
- Slide 3: Solution Detail 1
- Slide 4: Solution Detail 2
- Slide 5: Final CTA (custom brand CTA: "${cta}")
Include exact text copy and visual design notes for each slide.`;
    }

    if (client) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8,
        });
        return { content: completion.choices[0]?.message?.content || 'Generation failed.' };
      } catch (err) {
        this.logger.error('Content Studio generation error', err);
        return { content: this.getMockContent(params.type, params.topic, lang, cta) };
      }
    } else {
      return { content: this.getMockContent(params.type, params.topic, lang, cta) };
    }
  }

  private getMockContent(type: string, topic: string, lang: string, cta: string) {
    if (type === 'caption') {
      return `🔥 **HOOOOK!** Kya aap ${topic} se pareshan hain? 

Hum lekar aaye hain ekdum simplified solution jo aapki problems ko chutkiyon me solve kar dega! Check these out:
✅ 100% automated matching.
✅ Instant results without any technical struggle.
✅ Trusted by 10,000+ happy Indian business owners!

🚀 Intezar mat kijiye. Aaj hi grow kijiye!
👉 **${cta}**

#${topic.replace(/\s+/g, '')} #IndianSMB #DigitalMarketing #AIContent #BusinessOS`;
    } else if (type === 'ad_copy') {
      return `📢 **Attention Indian SMB Owners!** 

Kya aap customer reach double karna chahte hain? 
Introducing the ultimate solution for **${topic}**! 

💡 **Kyu choose karein humein?**
- Sabse fast setup: Zero coding required.
- Cost-effective pricing for local retail & service shops.
- WhatsApp automation that does the sales work for you 24/7!

👉 **${cta}**`;
    } else {
      return `🌟 **5 Carousel Slides Outline for ${topic}**

📈 **Slide 1 (Cover):**
- *Text:* How to dominate ${topic} in 2026? (Hindi: Ab grow karna aasan hai!)
- *Visual:* Vibrant green gradient slide with a central smartphone graphic showing conversion graphs.

🧠 **Slide 2 (The Problem):**
- *Text:* Most businesses fail because of poor execution. (90% log customer response time me slow hote hain!)
- *Visual:* Split screen contrasting a busy owner vs an organized automated dashboard.

🛠️ **Slide 3 (The Fix):**
- *Text:* Speed-to-lead matters. (WhatsApp automatic reply instantly convert karta hai).
- *Visual:* Circular flowchart showing WhatsApp CRM trigger steps.

🚀 **Slide 4 (The Growth):**
- *Text:* Generate 3x more premium leads.
- *Visual:* High rise line graph showing click conversions.

🔥 **Slide 5 (CTA):**
- *Text:* Ready to scale? 
- *Visual:* Logo overlay showing the custom CTA: **"${cta}"**`;
    }
  }

  // ==========================================
  // AI CONTENT IDEAS METHODS
  // ==========================================

  async generateIdeas(workspaceId: string, params: { niche: string }) {
    const client = this.aiService.getClient();
    const model = this.aiService.getChatModel();

    const systemPrompt = `You are a viral growth hacker and SaaS marketing advisor. 
Provide 3 viral reel content ideas matching the user's business niche. 
For each idea, provide a Catchy Title, Hook line, description, and Call to Action. Return it as a JSON array.`;

    const userPrompt = `Generate 3 viral content ideas for niche: "${params.niche}"`;

    if (client) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" }
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
        return parsed.ideas || parsed;
      } catch (err) {
        return this.getMockIdeas(params.niche);
      }
    } else {
      return this.getMockIdeas(params.niche);
    }
  }

  private getMockIdeas(niche: string) {
    return [
      {
        title: `3 Common Mistakes in ${niche} (Jo aapka loss kara rahi hain)`,
        hook: `Stop doing this right now agar aap customer lose nahi karna chahte!`,
        description: `Highlight common errors in ${niche} and show the correct, smart way using technology.`,
        cta: `Comment 'AUDIT' to check your metrics today!`,
        type: `REEL`
      },
      {
        title: `The Secret Formula to Scale Your ${niche} Shop`,
        hook: `Ye ek simple hack aapki sales ko 2x kar dega!`,
        description: `Introduce speed-to-lead automation on WhatsApp and how local shops save 10+ hours a week.`,
        cta: `DM us 'SCALE' to get a free custom demo.`,
        type: `REEL`
      },
      {
        title: `Behind The Scenes: How we handle 500+ ${niche} enquiries`,
        hook: `Wanna see what an organized local company looks like?`,
        description: `A fast office vlog showing inbox screens, leads pipelines, and active chat conversions.`,
        cta: `Click the link in bio to start your free trial!`,
        type: `REEL`
      }
    ];
  }

  // ==========================================
  // REEL CREATOR METHODS
  // ==========================================

  async createReelProject(workspaceId: string, params: {
    title: string;
    niche: string;
    offer: string;
    voiceId?: string;
  }) {
    const client = this.aiService.getClient();
    const model = this.aiService.getChatModel();

    let script = '';
    let scenes = [];

    const systemPrompt = `You are a short-form video director.
Create a high-impact 30-second vertical Reel script (4 scenes) about topic: "${params.title}" in niche: "${params.niche}" pitching: "${params.offer}".
For each scene, return a scene text narration (Hinglish/English), duration (4-6s), transition style (fade, slide, pop), and a descriptive image generation prompt.`;

    if (client) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate 4 scenes for: "${params.title}"` }
          ]
        });
        script = completion.choices[0]?.message?.content || '';
        scenes = this.parseMockScenes(params.title);
      } catch (err) {
        script = `Sample Reel Script for ${params.title}`;
        scenes = this.parseMockScenes(params.title);
      }
    } else {
      script = `Sample Reel Script for ${params.title}`;
      scenes = this.parseMockScenes(params.title);
    }

    const project = await this.prisma.reelProject.create({
      data: {
        workspaceId,
        title: params.title,
        niche: params.niche,
        offer: params.offer,
        script,
        voiceVoiceId: params.voiceId || 'eleven_labs_male_01',
        videoUrl: '/assets/sample-vertical.mp4',
        status: 'COMPLETED',
      }
    });

    await this.prisma.reelScene.createMany({
      data: scenes.map((s, idx) => ({
        projectId: project.id,
        sceneNumber: idx + 1,
        text: s.text,
        imagePrompt: s.imagePrompt,
        imageUrl: s.imageUrl,
        duration: s.duration,
        transition: s.transition,
      }))
    });

    return this.prisma.reelProject.findUnique({
      where: { id: project.id },
      include: { scenes: { orderBy: { sceneNumber: 'asc' } } }
    });
  }

  private parseMockScenes(title: string) {
    return [
      {
        text: `Stop scrolling! Agar aap bhi ${title} me struggle kar rahe hain, toh ye video end tak dekhein.`,
        imagePrompt: `A frustrated business owner holding a smartphone, highly detailed graphic, neon green accents`,
        imageUrl: `https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=500&auto=format&fit=crop`,
        duration: 5.0,
        transition: 'fade'
      },
      {
        text: `Sachai ye hai ki 90% businesses traditional systems use karte hain jo slow hain aur clients miss karte hain.`,
        imagePrompt: `A messy desk with papers flying around, dark theme, conceptual art`,
        imageUrl: `https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop`,
        duration: 6.0,
        transition: 'slide'
      },
      {
        text: `Lekin humara AI Content & Communication OS instantly chats handle karke leads collect karta hai!`,
        imagePrompt: `High tech workspace showing beautiful data dashboard glowing green, highly detailed 8k render`,
        imageUrl: `https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop`,
        duration: 6.0,
        transition: 'pop'
      },
      {
        text: `Abhi click karein aur WhatsApp par start karein grow karna! Link in bio.`,
        imagePrompt: `A futuristic button with green glow saying "START NOW", 3d graphic design`,
        imageUrl: `https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=500&auto=format&fit=crop`,
        duration: 5.0,
        transition: 'fade'
      }
    ];
  }

  async getReelProjects(workspaceId: string) {
    return this.prisma.reelProject.findMany({
      where: { workspaceId },
      include: { scenes: { orderBy: { sceneNumber: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async renderReel(projectId: string) {
    const project = await this.prisma.reelProject.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    // Simulate FFmpeg/Remotion compile
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return this.prisma.reelProject.update({
      where: { id: projectId },
      data: {
        videoUrl: '/assets/sample-vertical.mp4',
        status: 'COMPLETED'
      },
      include: { scenes: { orderBy: { sceneNumber: 'asc' } } }
    });
  }

  // ==========================================
  // MEDIA LIBRARY METHODS
  // ==========================================

  async getMediaAssets(workspaceId: string, folder?: string) {
    return this.prisma.mediaAsset.findMany({
      where: { workspaceId, folder: folder || undefined },
      orderBy: { createdAt: 'desc' }
    });
  }

  async uploadMediaAsset(workspaceId: string, data: { name: string; url: string; type: string; size?: number; folder?: string }) {
    return this.prisma.mediaAsset.create({
      data: {
        workspaceId,
        name: data.name,
        url: data.url,
        type: data.type,
        size: data.size || 1024,
        folder: data.folder || 'General'
      }
    });
  }

  async deleteMediaAsset(workspaceId: string, id: string) {
    return this.prisma.mediaAsset.delete({
      where: { id, workspaceId }
    });
  }

  // ==========================================
  // CONTENT CALENDAR & SOCIAL PUBLISHING
  // ==========================================

  async getScheduledPosts(workspaceId: string) {
    return this.prisma.scheduledPost.findMany({
      where: { workspaceId },
      orderBy: { scheduledAt: 'asc' }
    });
  }

  async schedulePost(workspaceId: string, data: { title: string; content: string; scheduledAt: string; platform: string }) {
    const post = await this.prisma.scheduledPost.create({
      data: {
        workspaceId,
        title: data.title,
        content: data.content,
        scheduledAt: new Date(data.scheduledAt),
        platform: data.platform,
        status: 'PENDING'
      }
    });

    // Create a mock SocialPost linked as scheduled
    await this.prisma.socialPost.create({
      data: {
        workspaceId,
        caption: data.content,
        platforms: [data.platform.toLowerCase()],
        status: 'SCHEDULED',
        scheduledAt: new Date(data.scheduledAt),
      }
    });

    return post;
  }

  async getSocialAccounts(workspaceId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { workspaceId }
    });

    if (accounts.length === 0) {
      // Auto seed some dummy integrations for rich first-time UI preview
      await this.prisma.socialAccount.createMany({
        data: [
          {
            workspaceId,
            platform: 'INSTAGRAM',
            accountId: 'ig_1234567890',
            accountName: 'Luminous Solar (Instagram)',
            profilePicture: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop'
          },
          {
            workspaceId,
            platform: 'FACEBOOK',
            accountId: 'fb_1234567890',
            accountName: 'Luminous Solar (Facebook Page)',
            profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop'
          }
        ]
      });
      const seeded = await this.prisma.socialAccount.findMany({
        where: { workspaceId }
      });
      return seeded.map((acc: any) => ({ ...acc, accessToken: acc.accessToken ? '******' : null }));
    }

    return accounts.map((acc: any) => ({ ...acc, accessToken: acc.accessToken ? '******' : null }));
  }

  async connectSocialAccount(workspaceId: string, data: {
    platform: string;
    accountId: string;
    accountName: string;
    accessToken: string;
    profilePicture?: string;
  }) {
    const encryptedToken = this.secretsCrypto.encryptIfNeeded(data.accessToken);

    const account = await this.prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_accountId: {
          workspaceId,
          platform: data.platform,
          accountId: data.accountId,
        },
      },
      update: {
        accountName: data.accountName,
        accessToken: encryptedToken,
        profilePicture: data.profilePicture || null,
      },
      create: {
        workspaceId,
        platform: data.platform,
        accountId: data.accountId,
        accountName: data.accountName,
        accessToken: encryptedToken,
        profilePicture: data.profilePicture || null,
      },
    });

    return { ...account, accessToken: '******' };
  }

  async decryptSocialToken(socialAccountId: string): Promise<string | null> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: socialAccountId }
    });
    if (!account || !account.accessToken) return null;
    return this.secretsCrypto.decryptIfNeeded(account.accessToken);
  }

  // ==========================================
  // UNIFIED ANALYTICS VISUALIZER
  // ==========================================

  async getPlatformAnalytics(workspaceId: string) {
    // Collect stats from database leads & campaigns
    const leads = await this.prisma.lead.findMany({
      where: { workspaceId },
      select: { status: true }
    });

    const activeCampaigns = await this.prisma.campaign.count({ where: { workspaceId } });

    // Format metrics
    const stats = {
      reach: {
        instagramReelViews: 45290,
        instagramFollowers: 12480,
        facebookLikes: 8930,
        postEngagements: 3820,
      },
      crm: {
        totalLeads: leads.length,
        closedDeals: leads.filter((l) => l.status === LeadStatus.CLOSED).length,
        interestedLeads: leads.filter((l) => l.status === LeadStatus.INTERESTED).length,
        activeCampaigns,
      },
      charts: {
        engagementTrend: [
          { date: 'Mon', views: 5200, clicks: 310, leads: 18 },
          { date: 'Tue', views: 6800, clicks: 420, leads: 25 },
          { date: 'Wed', views: 8100, clicks: 510, leads: 32 },
          { date: 'Thu', views: 7900, clicks: 480, leads: 29 },
          { date: 'Fri', views: 9500, clicks: 650, leads: 41 },
          { date: 'Sat', views: 12000, clicks: 820, leads: 54 },
          { date: 'Sun', views: 11000, clicks: 750, leads: 48 }
        ],
        platformSplit: [
          { name: 'Instagram', value: 65 },
          { name: 'Facebook', value: 25 },
          { name: 'WhatsApp Direct', value: 10 }
        ]
      }
    };

    return stats;
  }

  // ==========================================
  // AI RESEARCH ENGINE METHODS
  // ==========================================

  async getResearchHistory(workspaceId: string) {
    return this.prisma.researchReport.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteResearch(workspaceId: string, id: string) {
    return this.prisma.researchReport.delete({
      where: { id, workspaceId }
    });
  }

  async generateResearch(workspaceId: string, params: { topic: string; niche: string }) {
    const client = this.aiService.getClient();
    const model = this.aiService.getChatModel();

    const systemPrompt = `You are an elite short-form growth hacker, SaaS marketing consultant, and viral hook copywriter specializing in Indian SMB competitive intelligence.
Generate a comprehensive, highly actionable growth research report based on the user's business niche and targeted topic.
You MUST return a JSON object with this exact schema:
{
  "viralHooks": [
    { "hook": "The specific video hook text copy in Hinglish or conversational Hindi/English", "type": "Curiosity / Contrarian / Pain-Point / Direct-Value", "ctrPower": 95, "executionTips": "Tips on how to film/present this hook visually" }
  ],
  "competitors": [
    { "weakness": "Detail common weaknesses or generic strategies of competitors in this space", "opportunity": "Detail our specific growth advantage or angle of attack", "scriptAngle": "Recommended video angle or subtitle counter-strategy" }
  ],
  "trends": [
    { "query": "High-volume search query in India", "angle": "Trending visual angle or storyline suggestion", "keywords": ["kw1", "kw2"] }
  ]
}
Ensure the content is detailed, creative, and highly specific to the targeted niche. Limit hooks to exactly 3 high-impact entries, competitors to exactly 2 entries, and trends to exactly 2 entries.`;

    const userPrompt = `Generate a detailed growth research report for niche: "${params.niche}" and topic: "${params.topic}"`;

    let reportData: any = null;

    if (client) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.8,
        });

        reportData = JSON.parse(completion.choices[0]?.message?.content || '{}');
      } catch (err) {
        this.logger.error('Research Engine AI compilation error', err);
        reportData = this.getMockResearchData(params.niche, params.topic);
      }
    } else {
      reportData = this.getMockResearchData(params.niche, params.topic);
    }

    // Save report to database
    return this.prisma.researchReport.create({
      data: {
        workspaceId,
        topic: params.topic,
        niche: params.niche,
        viralHooks: reportData.viralHooks || [],
        competitors: reportData.competitors || [],
        trends: reportData.trends || [],
      }
    });
  }

  private getMockResearchData(niche: string, topic: string) {
    return {
      viralHooks: [
        {
          hook: `Stop scrolling! Agar aap bhi ${topic} me struggle kar rahe hain, toh ye 3 hacks miss mat karna.`,
          type: 'Pain-Point',
          ctrPower: 94,
          executionTips: 'Start with a close-up visual showing a frustrated face, then point to the screen showing statistics.'
        },
        {
          hook: `Most local businesses fail because of this one mistake in ${niche}. Jo aapka lakhon ka loss kara rahi hai!`,
          type: 'Contrarian',
          ctrPower: 97,
          executionTips: 'Open with high-tempo background music, showing cash transition animations, pointing aggressively.'
        },
        {
          hook: `The simple secret formula to double your leads in ${topic}. Ab local clients dhoondna band karo!`,
          type: 'Curiosity',
          ctrPower: 92,
          executionTips: 'Hold a green whiteboard, write the word "REVENUE" and circle it in front of the camera.'
        }
      ],
      competitors: [
        {
          weakness: `Most competitors in ${niche} are still running standard, slow newspaper flyers and manual calls which take 24 hours to respond.`,
          opportunity: `Deploy dynamic speed-to-lead automation that instantly text back incoming queries on WhatsApp within 30 seconds!`,
          scriptAngle: 'Highlight speed-to-lead contrasting a slow competitor office vs your live instantly converting dashboards.'
        },
        {
          weakness: `Generic brand captions and boring stock images that look identical to every local business in India.`,
          opportunity: `Use conversational Romanized Hinglish hooks pitching immediate value combined with curated vertical custom timelines.`,
          scriptAngle: 'Speak casually in Roman script, showing dynamic real-world screenshots of client metrics.'
        }
      ],
      trends: [
        {
          query: `Best local ${niche} services near me`,
          angle: 'Show a behind-the-scenes office vlog, showing your pipeline and how active calls get converted instantly.',
          keywords: [niche.toLowerCase(), 'leadmanager', 'smbgrowth', 'automation']
        },
        {
          query: `How to save money on ${topic} setup`,
          angle: 'Break down the direct ROI calculation of switching from traditional slow systems to an automated, structured SaaS pipeline.',
          keywords: ['savemoney', topic.replace(/\s+/g, '').toLowerCase(), 'techhacks', 'indianbiz']
        }
      ]
    };
  }
}
