import {
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(1)
  templateName!: string;

  @IsOptional()
  @IsObject()
  templateParams?: Record<string, string>;
}

export class ScheduleCampaignDto {
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
