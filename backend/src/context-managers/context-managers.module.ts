import { Module } from '@nestjs/common';
import { ContextManagersController } from './context-managers.controller';
import { ContextManagersService } from './context-managers.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ContextManagersController],
  providers: [ContextManagersService],
  exports: [ContextManagersService],
})
export class ContextManagersModule {}

