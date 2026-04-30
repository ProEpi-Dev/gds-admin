import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { report_type_enum } from '@prisma/client';

export const REPORT_VIEW_APP = 'app' as const;

export class ReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      '`app`: resposta enxuta para o app (previewText; integração só com config ativa + community_signal); sem formResponse/occurrenceLocation na lista.',
    enum: [REPORT_VIEW_APP],
    example: REPORT_VIEW_APP,
  })
  @IsOptional()
  @IsIn([REPORT_VIEW_APP])
  view?: typeof REPORT_VIEW_APP;

  @ApiPropertyOptional({
    description: 'Filtrar por status ativo',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por participação',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  participationId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por versão do formulário',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  formVersionId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de report',
    enum: report_type_enum,
    example: 'POSITIVE',
  })
  @IsEnum(report_type_enum)
  @IsOptional()
  reportType?: report_type_enum;

  @ApiPropertyOptional({
    description: 'Filtrar por formulário (ID)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  formId?: number;

  @ApiPropertyOptional({
    description: 'Data inicial para filtrar reports (formato: YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsString()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data final para filtrar reports (formato: YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsString()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por contexto (reports cuja participação pertence ao contexto)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  contextId?: number;
}
