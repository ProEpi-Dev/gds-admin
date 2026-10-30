import { Module } from '@nestjs/common';
import { TrackProgressController } from './track-progress.controller';
import { TrackProgressService } from './track-progress.service';
import { TrackProgressAccessService } from './track-progress-access.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TrackProgressController],
  providers: [TrackProgressService, TrackProgressAccessService],
  exports: [TrackProgressService],
})
export class TrackProgressModule {}
