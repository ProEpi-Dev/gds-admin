import { Module } from '@nestjs/common';
import { ParticipationsController } from './participations.controller';
import { ParticipationsService } from './participations.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ParticipationsController],
  providers: [ParticipationsService],
  exports: [ParticipationsService],
})
export class ParticipationsModule {}
