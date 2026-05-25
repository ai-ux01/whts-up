import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AutomationAction, AutomationTrigger } from '@prisma/client';

export class CreateAutomationDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(AutomationTrigger)
  trigger!: AutomationTrigger;

  @IsEnum(AutomationAction)
  action!: AutomationAction;

  @IsObject()
  config!: { message: string; templateName?: string };

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
