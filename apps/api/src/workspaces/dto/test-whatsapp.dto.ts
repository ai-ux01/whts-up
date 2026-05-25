import { IsOptional, IsString } from 'class-validator';

export class TestWhatsAppDto {
  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  message?: string;
}
