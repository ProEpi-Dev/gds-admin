import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsObject,
  IsISO8601,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { report_type_enum } from '@prisma/client';

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
    nullable: true,
  })
  @IsObject()
  @IsOptional()
  formResponse: any;

  @ApiPropertyOptional({
    description: 'Localização da ocorrência (JSON)',
    example: { latitude: -23.5505, longitude: -46.6333 },
  })
  @IsObject()
  @IsOptional()
  occurrenceLocation?: any;

  @ApiPropertyOptional({
    description:
      'Momento em que o participante fez o reporte no aparelho, em ISO 8601 com hora e fuso. ' +
      'No reporte offline é anterior ao envio. Se omitido, vale o horário em que o servidor grava. ' +
      'Datas no futuro (além de 5 min) ou anteriores à participação são trocadas pelo horário do servidor.',
    example: '2026-10-08T14:30:00-03:00',
  })
  @IsISO8601({ strict: true })
  @Matches(/T\d{2}:\d{2}.*(Z|[+-]\d{2}:?\d{2})$/, {
    message: 'reportDate deve ter hora e fuso (ex.: 2026-10-08T14:30:00-03:00)',
  })
  @IsOptional()
  reportDate?: string;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
