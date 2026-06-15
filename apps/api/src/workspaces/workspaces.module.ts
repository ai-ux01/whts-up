import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [forwardRef(() => WhatsAppModule), IntegrationsModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
