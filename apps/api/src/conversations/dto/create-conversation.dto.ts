import { IsOptional, IsString, MinLength, IsEnum } from 'class-validator';
import { Channel } from '@prisma/client';

export class CreateConversationDto {
  @IsString()
  @MinLength(10)
  phone!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(Channel)
  channel?: Channel;
}
