import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';
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
}

