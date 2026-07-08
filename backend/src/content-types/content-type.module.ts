import { Module } from '@nestjs/common';
import { ContentTypeService } from './content-type.service';
import { ContentTypeController, ContentTypeAdminController } from './content-type.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ContentTypeService],
  controllers: [ContentTypeController, ContentTypeAdminController],
  exports: [ContentTypeService],
})
export class ContentTypeModule {}
