import { Module } from '@nestjs/common';
import { TrackCyclesController } from './track-cycles.controller';
import { TrackCyclesService } from './track-cycles.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TrackCyclesController],
  providers: [TrackCyclesService],
  exports: [TrackCyclesService],
})
export class TrackCyclesModule {}
