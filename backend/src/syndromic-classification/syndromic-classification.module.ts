import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthzModule } from '../authz/authz.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BiExportApiKeyController } from './bi-export-api-key.controller';
import { BiExportApiKeyGuard } from './bi-export-api-key.guard';
import { BiExportApiKeyService } from './bi-export-api-key.service';
import { SyndromicClassificationController } from './syndromic-classification.controller';
import { SyndromicClassificationService } from './syndromic-classification.service';

@Module({
  imports: [PrismaModule, AuthzModule, AuditLogModule],
  controllers: [SyndromicClassificationController, BiExportApiKeyController],
  providers: [
    SyndromicClassificationService,
    BiExportApiKeyGuard,
    BiExportApiKeyService,
  ],
  exports: [SyndromicClassificationService, BiExportApiKeyService],
})
export class SyndromicClassificationModule {}
