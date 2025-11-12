import { Module } from '@nestjs/common';
import { ContextsController } from './contexts.controller';
import { ContextsService } from './contexts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ContextsController],
  providers: [ContextsService],
  exports: [ContextsService],
})
export class ContextsModule {}

