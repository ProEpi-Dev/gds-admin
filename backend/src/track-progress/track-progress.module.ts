import { Module } from '@nestjs/common';
import { TrackProgressController } from './track-progress.controller';
import { TrackProgressService } from './track-progress.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TrackProgressController],
  providers: [TrackProgressService],
  exports: [TrackProgressService],
})
export class TrackProgressModule {}
