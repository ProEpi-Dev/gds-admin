import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ParticipationProfileExtraService } from './participation-profile-extra.service';
import { ParticipationProfileExtraController } from './participation-profile-extra.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ParticipationProfileExtraController],
  providers: [ParticipationProfileExtraService],
  exports: [ParticipationProfileExtraService],
})
export class ParticipationProfileExtraModule {}
