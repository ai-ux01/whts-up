import { Module } from '@nestjs/common';
import { ReputationController } from './reputation.controller';
import { ReputationService } from './reputation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReputationController],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}
