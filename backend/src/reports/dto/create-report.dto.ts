import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { report_type_enum } from '../../../generated/prisma/enums';

export class CreateReportDto {
  @ApiProperty({
    description: 'ID da participação',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  participationId: number;

  @ApiProperty({
    description: 'ID da versão do formulário',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  formVersionId: number;

  @ApiProperty({
    description: 'Tipo do report',
    enum: report_type_enum,
    example: 'POSITIVE',
  })
  @IsEnum(report_type_enum)
  reportType: report_type_enum;

  @ApiProperty({
    description: 'Resposta do formulário (JSON)',
    example: { campo1: 'valor1', campo2: 'valor2' },
  })
  @IsObject()
  formResponse: any;

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
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

