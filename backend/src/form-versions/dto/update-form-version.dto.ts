import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { form_version_access_type } from '@prisma/client';

export class UpdateFormVersionDto {
  @ApiPropertyOptional({
    description: 'Tipo de acesso da versão',
    enum: form_version_access_type,
    example: 'PUBLIC',
  })
  @IsEnum(form_version_access_type)
  @IsOptional()
  accessType?: form_version_access_type;

  @ApiPropertyOptional({
    description: 'Definição do formulário (JSON)',
    example: { fields: [{ name: 'campo1', type: 'text' }] },
  })
  @IsObject()
  @IsOptional()
  definition?: any;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Nota mínima para aprovação (0-100)',
    example: 70.0,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  passingScore?: number | null;

  @ApiPropertyOptional({
    description: 'Número máximo de tentativas',
    example: 3,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  maxAttempts?: number | null;

  @ApiPropertyOptional({
    description: 'Tempo limite em minutos',
    example: 30,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  timeLimitMinutes?: number | null;

  @ApiPropertyOptional({
    description: 'Mostrar feedback após resposta',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  showFeedback?: boolean;

  @ApiPropertyOptional({
    description: 'Randomizar ordem das questões',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  randomizeQuestions?: boolean;
}
