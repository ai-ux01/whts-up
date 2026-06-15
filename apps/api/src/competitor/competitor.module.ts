import { Module, forwardRef } from '@nestjs/common';
import { CompetitorController } from './competitor.controller';
import { CompetitorService } from './competitor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [PrismaModule, forwardRef(() => MessagesModule)],
  controllers: [CompetitorController],
  providers: [CompetitorService],
  exports: [CompetitorService],
})
export class CompetitorModule {}
