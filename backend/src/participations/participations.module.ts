import { Module } from '@nestjs/common';
import { ParticipationsController } from './participations.controller';
import { ParticipationsService } from './participations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthzModule } from '../authz/authz.module';

@Module({
  imports: [PrismaModule, AuthzModule],
  controllers: [ParticipationsController],
  providers: [ParticipationsService],
  exports: [ParticipationsService],
})
export class ParticipationsModule {}
