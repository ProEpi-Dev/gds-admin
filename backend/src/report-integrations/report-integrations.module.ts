import { Module } from '@nestjs/common';
import { ReportIntegrationsController } from './report-integrations.controller';
import { ReportIntegrationsService } from './report-integrations.service';
import { EphemClient } from './ephem.client';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthzModule } from '../authz/authz.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuthzModule, AuditLogModule],
  controllers: [ReportIntegrationsController],
  providers: [ReportIntegrationsService, EphemClient],
  exports: [ReportIntegrationsService],
})
export class ReportIntegrationsModule {}
