import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LegalDocumentsModule } from '../legal-documents/legal-documents.module';
import { ParticipationProfileExtraModule } from '../participation-profile-extra/participation-profile-extra.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    PrismaModule,
    LegalDocumentsModule,
    ParticipationProfileExtraModule,
    AuditLogModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
