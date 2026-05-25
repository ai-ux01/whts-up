import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateWorkspaceSettingsDto {
  @IsOptional()
  @IsString()
  whatsappPhoneNumberId?: string;

  @IsOptional()
  @IsString()
  whatsappAccessToken?: string;

  @IsOptional()
  @IsString()
  webhookVerifyToken?: string;

  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @IsOptional()
  @IsString()
  aiSystemPrompt?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  metaAdsAccountId?: string;

  @IsOptional()
  @IsString()
  metaPageId?: string;

  @IsOptional()
  @IsString()
  googleAdsCustomerId?: string;

  @IsOptional()
  @IsString()
  facebookPixelId?: string;

  @IsOptional()
  @IsString()
  instagramUsername?: string;

  @IsOptional()
  @IsString()
  defaultUtmSource?: string;
}
