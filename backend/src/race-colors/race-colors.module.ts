import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RaceColorsController } from './race-colors.controller';
import { RaceColorsService } from './race-colors.service';

@Module({
  imports: [PrismaModule],
  controllers: [RaceColorsController],
  providers: [RaceColorsService],
  exports: [RaceColorsService],
})
export class RaceColorsModule {}
