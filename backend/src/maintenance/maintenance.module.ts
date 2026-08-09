import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceWindowsService } from './maintenance-windows.service';
import { MaintenanceWindowsController } from './maintenance-windows.controller';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [MaintenanceWindowsController],
  providers: [MaintenanceService, MaintenanceWindowsService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
