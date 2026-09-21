import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { CommandCenterService } from './command-center.service';
import { IntelligenceService } from './intelligence.service';

@Module({
  imports: [AiModule, IntegrationsModule],
  controllers: [DashboardController],
  providers: [DashboardService, CommandCenterService, IntelligenceService],
})
export class DashboardModule {}
