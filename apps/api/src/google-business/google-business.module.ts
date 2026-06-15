import { Module } from '@nestjs/common';
import { GoogleBusinessService } from './google-business.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GoogleBusinessService],
  exports: [GoogleBusinessService],
})
export class GoogleBusinessModule {}
