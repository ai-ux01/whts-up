import { Module, forwardRef } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { LeadsModule } from '../leads/leads.module';
import { MessagesModule } from '../messages/messages.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { WhatsAppAliasController } from './whatsapp-alias.controller';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [
    forwardRef(() => WorkspacesModule),
    forwardRef(() => ConversationsModule),
    forwardRef(() => MessagesModule),
    LeadsModule,
    RealtimeModule,
    forwardRef(() => AiModule),
  ],
  controllers: [WhatsAppController, WhatsAppAliasController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
