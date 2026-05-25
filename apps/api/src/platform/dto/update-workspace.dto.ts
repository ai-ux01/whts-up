import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { WorkspaceStatus } from '@prisma/client';

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(WorkspaceStatus)
  status?: WorkspaceStatus;
}
