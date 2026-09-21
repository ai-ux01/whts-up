import {
  Allow,
  IsArray,
  IsHexColor,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBrandKitDto {
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  fontFamily?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  brandVoice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  ctaTemplate?: string;
}

export class GenerateContentDto {
  @IsString()
  @MaxLength(40)
  type!: string;

  @IsString()
  @MaxLength(300)
  topic!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  language?: string;
}

export class ApplyBrandKitDto {
  @IsString()
  @MaxLength(8000)
  content!: string;
}

export class GenerateIdeasDto {
  @IsString()
  @MaxLength(120)
  niche!: string;

  // Optional seed carried from Research (a competitor gap / trending query / viral hook)
  // so generated ideas build directly on that specific angle.
  @IsOptional()
  @IsString()
  @MaxLength(400)
  seed?: string;
}

export class CreateReelDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(120)
  niche!: string;

  @IsString()
  @MaxLength(300)
  offer!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  voiceId?: string;
}

export class SchedulePostDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsString()
  scheduledAt!: string;

  @IsIn(['INSTAGRAM', 'FACEBOOK', 'BOTH'])
  platform!: string;
}

export class ConnectSocialAccountDto {
  @IsString()
  @MaxLength(40)
  platform!: string;

  @IsString()
  @MaxLength(120)
  accountId!: string;

  @IsString()
  @MaxLength(200)
  accountName!: string;

  @IsString()
  @MaxLength(4096)
  accessToken!: string;

  @IsOptional()
  @IsUrl()
  profilePicture?: string;
}

export class GenerateResearchDto {
  @IsString()
  @MaxLength(300)
  topic!: string;

  @IsString()
  @MaxLength(120)
  niche!: string;
}

export class ProductDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  price?: string;
}

export class UpdateBusinessProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  targetCustomer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  usp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  priceRange?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsappNumber?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  offers?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDto)
  products?: ProductDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competitors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class GenerateCampaignDto {
  @IsString()
  @MaxLength(300)
  topic!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  objective?: string;
}

export class MaterializePartsDto {
  @IsOptional()
  reel?: boolean;

  @IsOptional()
  post?: boolean;

  @IsOptional()
  whatsappCampaign?: boolean;
}

export class MaterializeCampaignDto {
  // The reviewed bundle (AI-generated, re-submitted by the client for storage).
  // @Allow keeps the whitelist pipe from stripping this free-form object.
  @Allow()
  bundle!: Record<string, unknown>;

  @ValidateNested()
  @Type(() => MaterializePartsDto)
  parts!: MaterializePartsDto;
}

export class UploadMediaMetaDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  size?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  folder?: string;
}
