import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class ParticipationQueryDto extends PaginationQueryDto {
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
    description: 'Filtrar por usuário',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por contexto',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  contextId?: number;

  @ApiPropertyOptional({
    description: 'Incluir dados do usuário (nome, email) na resposta',
    example: true,
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  includeUser?: boolean;

  @ApiPropertyOptional({
    description: 'Buscar por nome ou email do usuário (busca no servidor)',
    example: 'João',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Ordenação: name_asc, name_desc (nome do usuário), startDate_asc, startDate_desc (data de início da participação). Padrão: startDate_desc.',
    example: 'startDate_desc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['name_asc', 'name_desc', 'startDate_asc', 'startDate_desc'])
  sort?: string;
}
