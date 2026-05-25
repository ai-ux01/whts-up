import { z } from 'zod';
import { LeadStatus, UserRole } from './enums';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  workspaceName: z.string().min(2),
});

export const createAgentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1),
});

export const updateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  notes: z.string().optional(),
  assignedUserId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  name: z.string().optional(),
});

export const workspaceSettingsSchema = z.object({
  whatsappPhoneNumberId: z.string().optional(),
  whatsappAccessToken: z.string().optional(),
  webhookVerifyToken: z.string().optional(),
  aiEnabled: z.boolean().optional(),
  aiSystemPrompt: z.string().optional(),
  businessName: z.string().optional(),
});

export const createCampaignSchema = z.object({
  name: z.string().min(2),
  templateName: z.string().min(1),
  templateParams: z.record(z.string()).optional(),
});

export const scheduleCampaignSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
});

export const createAutomationSchema = z.object({
  name: z.string().min(2),
  trigger: z.literal('NO_REPLY_24H'),
  action: z.literal('SEND_MESSAGE'),
  config: z.object({
    message: z.string().min(1),
    templateName: z.string().optional(),
  }),
  enabled: z.boolean().default(true),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type SignupDto = z.infer<typeof signupSchema>;
export type CreateAgentDto = z.infer<typeof createAgentSchema>;
export type SendMessageDto = z.infer<typeof sendMessageSchema>;
export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;
export type WorkspaceSettingsDto = z.infer<typeof workspaceSettingsSchema>;
export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;
export type CreateAutomationDto = z.infer<typeof createAutomationSchema>;

export { UserRole, LeadStatus };
