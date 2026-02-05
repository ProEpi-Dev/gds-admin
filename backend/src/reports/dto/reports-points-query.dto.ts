import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsDateString, IsOptional, IsString } from 'class-validator';

export class ReportsPointsQueryDto {
  @ApiPropertyOptional({
    description:
      'ID do formulário (opcional - se não fornecido, retorna todos os formulários do contexto)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  formId?: number;

  @ApiPropertyOptional({
    description:
      'Referência do formulário (opcional - filtra por referência do formulário)',
    example: 'FORM-001',
  })
  @IsString()
  @IsOptional()
  formReference?: string;

  @ApiProperty({
    description: 'Data de início do período (formato: YYYY-MM-DD)',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Data de fim do período (formato: YYYY-MM-DD)',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsDateString()
  endDate: string;
}
