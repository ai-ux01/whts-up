import { Module, forwardRef } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    forwardRef(() => ConversationsModule),
    forwardRef(() => WhatsAppModule),
    RealtimeModule,
    IntegrationsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
