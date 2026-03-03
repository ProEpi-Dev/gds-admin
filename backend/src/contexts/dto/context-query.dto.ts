import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsEnum, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { context_access_type } from '@prisma/client';

export class ContextQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Tamanho da página (máx. 500 para contextos)',
    minimum: 1,
    maximum: 500,
    default: 20,
    example: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  @IsOptional()
  override pageSize?: number = 20;
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
    description: 'Filtrar por localização',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  locationId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de acesso',
    enum: context_access_type,
    example: 'PUBLIC',
  })
  @IsEnum(context_access_type)
  @IsOptional()
  accessType?: context_access_type;
}
