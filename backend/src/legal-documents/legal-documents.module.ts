import { Module } from '@nestjs/common';
import {
  LegalDocumentsController,
  LegalDocumentsAdminController,
} from './legal-documents.controller';
import { LegalDocumentsService } from './legal-documents.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LegalDocumentsController, LegalDocumentsAdminController],
  providers: [LegalDocumentsService],
  exports: [LegalDocumentsService],
})
export class LegalDocumentsModule {}
