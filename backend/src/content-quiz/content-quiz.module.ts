import { Module } from '@nestjs/common';
import { ContentQuizController } from './content-quiz.controller';
import { ContentQuizService } from './content-quiz.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ContentQuizController],
  providers: [ContentQuizService],
  exports: [ContentQuizService],
})
export class ContentQuizModule {}
