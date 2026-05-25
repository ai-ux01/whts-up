import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';

@Module({
  imports: [WhatsAppModule, MessagesModule],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
