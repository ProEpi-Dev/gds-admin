import { Module } from '@nestjs/common';
import { QuizSubmissionsController } from './quiz-submissions.controller';
import { QuizSubmissionsService } from './quiz-submissions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TrackProgressModule } from '../track-progress/track-progress.module';

@Module({
  imports: [PrismaModule, TrackProgressModule],
  controllers: [QuizSubmissionsController],
  providers: [QuizSubmissionsService],
  exports: [QuizSubmissionsService],
})
export class QuizSubmissionsModule {}

