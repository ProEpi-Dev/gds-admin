import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsDateString, IsOptional, IsString, Max, Min } from 'class-validator';

/** Teto de linhas por pedido no mapa. */
export const REPORTS_POINTS_MAX_LIMIT = 50_000;

/** Quando `limit` não vem na query, usa-se este teto (mapa + performance). */
export const REPORTS_POINTS_DEFAULT_LIMIT = 10_000;

export class ReportsPointsQueryDto {
  @ApiPropertyOptional({
    description: 'ID do contexto (obrigatório para admin; não-admin usa contexto gerenciado)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  contextId?: number;

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

  @ApiPropertyOptional({
    description:
      `Máximo de reports a carregar (pontos com lat/lng válidos podem ser menos). Omisso = ${REPORTS_POINTS_DEFAULT_LIMIT}. Máximo absoluto = ${REPORTS_POINTS_MAX_LIMIT}.`,
    example: 5000,
    minimum: 1,
    maximum: REPORTS_POINTS_MAX_LIMIT,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(REPORTS_POINTS_MAX_LIMIT)
  @IsOptional()
  limit?: number;
}
