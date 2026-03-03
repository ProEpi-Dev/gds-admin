import { Module, Global } from '@nestjs/common';
import { AuthzService } from './authz.service';
import { RolesGuard } from './guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuthzService, RolesGuard],
  exports: [AuthzService, RolesGuard],
})
export class AuthzModule {}
