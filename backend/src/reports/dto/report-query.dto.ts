import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsEnum } from 'class-validator';
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
}

