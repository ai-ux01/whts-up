import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { AiModule } from '../ai/ai.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [QueueModule, AiModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
