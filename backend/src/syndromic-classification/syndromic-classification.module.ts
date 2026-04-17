import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthzModule } from '../authz/authz.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SyndromicClassificationController } from './syndromic-classification.controller';
import { SyndromicClassificationService } from './syndromic-classification.service';

@Module({
  imports: [PrismaModule, AuthzModule, AuditLogModule],
  controllers: [SyndromicClassificationController],
  providers: [SyndromicClassificationService],
  exports: [SyndromicClassificationService],
})
export class SyndromicClassificationModule {}
