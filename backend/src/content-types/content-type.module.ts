import { Module } from '@nestjs/common';
import { ContentTypeService } from './content-type.service';
import { ContentTypeController, ContentTypeAdminController } from './content-type.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [ContentTypeService, PrismaService],
  controllers: [ContentTypeController, ContentTypeAdminController],
  exports: [ContentTypeService],
})
export class ContentTypeModule {}
