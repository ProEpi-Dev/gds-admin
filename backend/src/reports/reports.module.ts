import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthzModule } from '../authz/authz.module';
import { ReportIntegrationsModule } from '../report-integrations/report-integrations.module';
import { SyndromicClassificationModule } from '../syndromic-classification/syndromic-classification.module';

@Module({
  imports: [
    PrismaModule,
    AuthzModule,
    ReportIntegrationsModule,
    SyndromicClassificationModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
