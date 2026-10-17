import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  IsString,
  IsIn,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class TrackExecutionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Contexto das participações. Obrigatório para admin; manager usa os contextos que gerencia.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  contextId?: number;

  @ApiPropertyOptional({
    description: 'ID do ciclo de trilha para filtrar',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  trackCycleId?: number;

  @ApiPropertyOptional({
    description: 'ID da participação (aluno) para filtrar',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  participationId?: number;

  @ApiPropertyOptional({
    description: 'Tipo da sequência',
    enum: ['content', 'quiz'],
    example: 'quiz',
  })
  @IsOptional()
  @IsIn(['content', 'quiz'])
  sequenceType?: 'content' | 'quiz';

  @ApiPropertyOptional({
    description: 'Busca por nome da atividade (conteúdo ou quiz)',
    example: 'Introdução',
  })
  @IsOptional()
  @IsString()
  activityName?: string;

  @ApiPropertyOptional({
    description: 'Data de conclusão a partir de (ISO)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Data de conclusão até (ISO)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
