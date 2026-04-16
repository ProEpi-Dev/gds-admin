import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Número da página', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Tamanho da página',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Filtrar por ação' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ description: 'Filtrar por tipo da entidade alvo' })
  @IsString()
  @IsOptional()
  targetEntityType?: string;

  @ApiPropertyOptional({ description: 'Filtrar por usuário ator' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  actorUserId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por contexto' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  contextId?: number;

  @ApiPropertyOptional({ description: 'Data inicial (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Data final (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Busca textual em ação, entidade alvo e ator',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Direção da ordenação por data',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortDirection?: 'asc' | 'desc' = 'desc';
}
