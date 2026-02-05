import { Module } from '@nestjs/common';
import { FormVersionsController } from './form-versions.controller';
import { FormVersionsService } from './form-versions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FormVersionsController],
  providers: [FormVersionsService],
  exports: [FormVersionsService],
})
export class FormVersionsModule {}
