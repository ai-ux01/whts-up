import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { AiService } from '../ai/ai.service';
import { AutomationTrigger, AutomationAction } from '@prisma/client';
import { MessagesService } from '../messages/messages.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private messagesService: MessagesService,
    private whatsappService: WhatsAppService,
  ) {}

  async submitFeedback(workspaceId: string, dto: SubmitFeedbackDto) {
    this.logger.log(`Received feedback submission from ${dto.customerName} (Rating: ${dto.rating})`);

    // Create the feedback in DB
    const feedback = await this.prisma.feedback.create({
      data: {
        workspaceId,
        customerName: dto.customerName,
        phone: dto.phone,
        email: dto.email,
        rating: dto.rating,
        feedback: dto.feedback,
        source: dto.source || 'WIDGET',
      },
    });

    // Run AI analysis in the background if a review comment exists
    if (dto.feedback && dto.feedback.trim().length > 0) {
      this.analyzeFeedbackSentimentBackground(feedback.id, dto.feedback);
    } else {
      // Direct rating without comment: default sentiment based on stars
      const sentiment = dto.rating >= 4 ? 'POSITIVE' : dto.rating === 3 ? 'NEUTRAL' : 'NEGATIVE';
      await this.prisma.feedback.update({
        where: { id: feedback.id },
        data: { sentiment },
      });
    }

    // Trigger Reputation Automations
    this.triggerFeedbackAutomations(workspaceId, feedback.id, dto.rating, dto.customerName, dto.phone);

    return feedback;
  }

  private async analyzeFeedbackSentimentBackground(feedbackId: string, text: string) {
    try {
      const client = this.aiService.getClient();
      const model = this.aiService.getChatModel();

      if (!client) {
        this.logger.warn('AI Client not configured, skipping detailed feedback AI analysis.');
        return;
      }

      const prompt = `You are an expert customer sentiment analyst for Indian SMB businesses.
Analyze the following customer feedback text. It can be written in English, Hindi, or Hinglish (Hindi written in Latin script like "khana acha tha par delivery late thi").

Feedback text: "${text}"

Extract:
1. Sentiment: Classify as POSITIVE, NEUTRAL, or NEGATIVE.
2. Complaint Category: Extract one category if it is a complaint. Focus on operational areas: "Staff Behavior", "Delivery Delay", "Product Quality", "Pricing", "Billing Error", "Responsiveness", "Ambiance", "None".
3. Emotion: Happy, Sarcastic, Angry, Grateful, Frustrated, Indifferent.
4. Urgency: LOW, MEDIUM, or HIGH.
5. Customer Intent: What does the customer want? (Apology, Refund, Return, Support, Compliment, None).

Return a strict, valid JSON object matching this schema:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "complaintCategory": "Staff Behavior" | "Delivery Delay" | "Product Quality" | "Pricing" | "Billing Error" | "Responsiveness" | "Ambiance" | "None",
  "emotion": string,
  "urgency": "LOW" | "MEDIUM" | "HIGH",
  "customerIntent": string
}`;

      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content?.trim();
      if (responseText) {
        const result = JSON.parse(responseText);
        await this.prisma.feedback.update({
          where: { id: feedbackId },
          data: {
            sentiment: result.sentiment || 'NEUTRAL',
            complaintCategory: result.complaintCategory === 'None' ? null : result.complaintCategory,
          },
        });
        this.logger.log(`AI Sentiment completed for feedback ${feedbackId}: ${result.sentiment}, Category: ${result.complaintCategory}`);
      }
    } catch (error) {
      this.logger.error(`Error in background AI analysis for feedback ${feedbackId}:`, error);
    }
  }

  private async triggerFeedbackAutomations(
    workspaceId: string,
    feedbackId: string,
    rating: number,
    customerName: string,
    phone: string,
  ) {
    try {
      // 1. Negative Feedback Trigger: rating <= 3
      if (rating <= 3) {
        const rules = await this.prisma.automationRule.findMany({
          where: {
            workspaceId,
            enabled: true,
            trigger: AutomationTrigger.NEGATIVE_FEEDBACK_DETECTED,
          },
        });

        for (const rule of rules) {
          if (rule.action === AutomationAction.NOTIFY_ADMIN) {
            this.logger.log(`[Automation] Triggering admin alert for negative feedback by ${customerName} (Rating: ${rating})`);
            // Create a system alert log in conversations/messages if a contact exists
            const contact = await this.prisma.contact.findFirst({
              where: { workspaceId, phone },
            });
            if (contact) {
              const conv = await this.prisma.conversation.findFirst({
                where: { workspaceId, contactId: contact.id },
              });
              if (conv) {
                await this.messagesService.createSystemMessage(
                  conv.id,
                  `⚠️ [Alert: Negative Feedback Received] Rating: ${rating}/5 from ${customerName}. Comment: "${feedbackId}". Urgent action needed.`,
                );
              }
            }
          }
        }
      }

      // 2. Positive Feedback Trigger: rating >= 4
      if (rating >= 4) {
        const rules = await this.prisma.automationRule.findMany({
          where: {
            workspaceId,
            enabled: true,
            trigger: AutomationTrigger.POSITIVE_REVIEW_RECEIVED,
          },
        });

        for (const rule of rules) {
          if (rule.action === AutomationAction.SEND_MESSAGE) {
            const config = rule.config as { message: string };
            this.logger.log(`[Automation] Asking positive customer ${customerName} for a Google review.`);
            try {
              await this.whatsappService.sendTextMessage(
                workspaceId,
                phone,
                config.message || `Thank you so much for your feedback, ${customerName}! 🙏 If you have 10 seconds, please share your experience on our Google page to help other customers find us! 🌟`,
              );
            } catch (err) {
              this.logger.warn('Failed to send WhatsApp automation follow-up:', err);
            }
          }
        }
      }
    } catch (err) {
      this.logger.error('Error triggering feedback reputation automations:', err);
    }
  }

  async listFeedbacks(
    workspaceId: string,
    filters: { rating?: number; sentiment?: string; page?: number; limit?: number },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };
    if (filters.rating) where.rating = filters.rating;
    if (filters.sentiment) where.sentiment = filters.sentiment;

    const [total, data] = await Promise.all([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async getFeedbackStats(workspaceId: string) {
    const feedbacks = await this.prisma.feedback.findMany({
      where: { workspaceId },
    });

    const total = feedbacks.length;
    if (total === 0) {
      return {
        total: 0,
        averageRating: 0,
        sentimentBreakdown: { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 },
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    const averageRating = parseFloat((sum / total).toFixed(2));

    const sentimentBreakdown = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    for (const f of feedbacks) {
      const s = f.sentiment || 'NEUTRAL';
      if (s === 'POSITIVE') sentimentBreakdown.POSITIVE++;
      else if (s === 'NEGATIVE') sentimentBreakdown.NEGATIVE++;
      else sentimentBreakdown.NEUTRAL++;

      const r = f.rating as 1 | 2 | 3 | 4 | 5;
      if (ratingBreakdown[r] !== undefined) ratingBreakdown[r]++;
    }

    return {
      total,
      averageRating,
      sentimentBreakdown,
      ratingBreakdown,
    };
  }

  async getWidgetScript(workspaceId: string) {
    return {
      script: `
<!-- AI Reputation & Feedback Engine Widget -->
<script>
  (function() {
    var wsId = "${workspaceId}";
    var apiUrl = window.location.origin + "/api/v1";
    
    var btn = document.createElement("button");
    btn.innerText = "⭐ Feedback";
    btn.style.position = "fixed";
    btn.style.bottom = "20px";
    btn.style.right = "20px";
    btn.style.zIndex = "9999";
    btn.style.background = "#16a34a";
    btn.style.color = "#fff";
    btn.style.border = "none";
    btn.style.padding = "10px 16px";
    btn.style.borderRadius = "50px";
    btn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)";
    btn.style.cursor = "pointer";
    btn.style.fontFamily = "sans-serif";
    btn.style.fontWeight = "bold";

    btn.onclick = function() {
      var iframe = document.createElement("iframe");
      iframe.src = window.location.origin + "/feedback/" + wsId + "?widget=true";
      iframe.style.position = "fixed";
      iframe.style.bottom = "80px";
      iframe.style.right = "20px";
      iframe.style.width = "380px";
      iframe.style.height = "520px";
      iframe.style.border = "none";
      iframe.style.borderRadius = "12px";
      iframe.style.boxShadow = "0 8px 30px rgba(0,0,0,0.2)";
      iframe.style.zIndex = "99999";
      iframe.id = "feedback-engine-widget-iframe";
      
      var closeBtn = document.createElement("button");
      closeBtn.innerText = "✕";
      closeBtn.style.position = "fixed";
      closeBtn.style.bottom = "570px";
      closeBtn.style.right = "30px";
      closeBtn.style.background = "#ef4444";
      closeBtn.style.color = "#fff";
      closeBtn.style.border = "none";
      closeBtn.style.width = "28px";
      closeBtn.style.height = "28px";
      closeBtn.style.borderRadius = "50%";
      closeBtn.style.cursor = "pointer";
      closeBtn.style.zIndex = "100000";
      closeBtn.id = "feedback-engine-widget-close";

      closeBtn.onclick = function() {
        document.getElementById("feedback-engine-widget-iframe").remove();
        document.getElementById("feedback-engine-widget-close").remove();
      };

      document.body.appendChild(iframe);
      document.body.appendChild(closeBtn);
    };

    document.body.appendChild(btn);
  })();
</script>
      `.trim(),
    };
  }
}
