import {
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  IsEnum,
} from 'class-validator';
import { Channel } from '@prisma/client';

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsObject()
  templateParams?: Record<string, string>;

  @IsOptional()
  @IsString()
  segmentId?: string | null;

  @IsOptional()
  @IsEnum(Channel)
  channel?: Channel;

  @IsOptional()
  @IsString()
  subject?: string | null;

  @IsOptional()
  @IsString()
  body?: string | null;
}

export class ScheduleCampaignDto {
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
