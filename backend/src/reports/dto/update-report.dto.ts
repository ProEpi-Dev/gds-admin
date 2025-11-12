import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { report_type_enum } from '../../../generated/prisma/enums';

export class UpdateReportDto {
  @ApiPropertyOptional({
    description: 'ID da participação',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  participationId?: number;

  @ApiPropertyOptional({
    description: 'ID da versão do formulário',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  formVersionId?: number;

  @ApiPropertyOptional({
    description: 'Tipo do report',
    enum: report_type_enum,
    example: 'POSITIVE',
  })
  @IsEnum(report_type_enum)
  @IsOptional()
  reportType?: report_type_enum;

  @ApiPropertyOptional({
    description: 'Resposta do formulário (JSON)',
    example: { campo1: 'valor1', campo2: 'valor2' },
  })
  @IsObject()
  @IsOptional()
  formResponse?: any;

  @ApiPropertyOptional({
    description: 'Localização da ocorrência (JSON)',
    example: { latitude: -23.5505, longitude: -46.6333 },
  })
  @IsObject()
  @IsOptional()
  occurrenceLocation?: any;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

