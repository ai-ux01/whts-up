import {
  IsHexColor,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
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

export class GenerateIdeasDto {
  @IsString()
  @MaxLength(120)
  niche!: string;
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
