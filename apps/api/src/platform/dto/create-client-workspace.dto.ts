import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateClientWorkspaceDto {
  @IsString()
  @MinLength(2)
  workspaceName!: string;

  @IsString()
  @MinLength(2)
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @IsOptional()
  @IsString()
  businessName?: string;
}
