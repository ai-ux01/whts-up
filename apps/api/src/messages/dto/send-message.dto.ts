import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;

  /** Allow free-text when 24h window is closed (may fail at Meta). */
  @IsOptional()
  @IsBoolean()
  forceSend?: boolean;
}
