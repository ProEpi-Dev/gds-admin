import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SetupModule } from './setup/setup.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { ContextsModule } from './contexts/contexts.module';
import { ParticipationsModule } from './participations/participations.module';
import { ContextManagersModule } from './context-managers/context-managers.module';
import { FormsModule } from './forms/forms.module';
import { FormVersionsModule } from './form-versions/form-versions.module';
import { ReportsModule } from './reports/reports.module';
import { ContentModule } from './content/content.module';
import { TagModule } from './tags/tag.module';
import { ContentQuizModule } from './content-quiz/content-quiz.module';
import { QuizSubmissionsModule } from './quiz-submissions/quiz-submissions.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    SetupModule,
    UsersModule,
    LocationsModule,
    ContextsModule,
    ParticipationsModule,
    ContextManagersModule,
    FormsModule,
    FormVersionsModule,
    ReportsModule,
    ContentModule,
    TagModule,
    ContentQuizModule,
    QuizSubmissionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
