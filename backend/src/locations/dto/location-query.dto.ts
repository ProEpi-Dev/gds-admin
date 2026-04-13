import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { LocationOrgLevelDto } from './create-location.dto';

export class LocationQueryDto extends PaginationQueryDto {
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
    description: 'Filtrar por localização pai',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  parentId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por nível organizacional',
    enum: LocationOrgLevelDto,
    example: LocationOrgLevelDto.COUNTRY,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(LocationOrgLevelDto)
  @IsOptional()
  orgLevel?: LocationOrgLevelDto;
}
