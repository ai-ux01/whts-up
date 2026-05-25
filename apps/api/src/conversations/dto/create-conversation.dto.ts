import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @MinLength(10)
  phone!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
