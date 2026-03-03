import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthzModule } from '../authz/authz.module';

@Module({
  imports: [PrismaModule, AuthzModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
