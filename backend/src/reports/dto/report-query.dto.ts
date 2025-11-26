import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { report_type_enum } from '@prisma/client';

export class ReportQueryDto extends PaginationQueryDto {
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
}

