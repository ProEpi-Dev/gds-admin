import { Module } from '@nestjs/common';
import { ReportIntegrationsController } from './report-integrations.controller';
import { ReportIntegrationsService } from './report-integrations.service';
import { EphemClient } from './ephem.client';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthzModule } from '../authz/authz.module';

@Module({
  imports: [PrismaModule, AuthzModule],
  controllers: [ReportIntegrationsController],
  providers: [ReportIntegrationsService, EphemClient],
  exports: [ReportIntegrationsService],
})
export class ReportIntegrationsModule {}
