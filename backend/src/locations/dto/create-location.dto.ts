import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LocationOrgLevelDto {
  COUNTRY = 'COUNTRY',
  STATE_DISTRICT = 'STATE_DISTRICT',
  CITY_COUNCIL = 'CITY_COUNCIL',
  /** Local/ponto/área não administrativo (ex.: casa, lote, campus, praça). */
  SITE = 'SITE',
}

export class CreateLocationDto {
  @ApiProperty({
    description: 'Nome da localização',
    example: 'São Paulo',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'ID da localização pai (para hierarquia)',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  parentId?: number;

  @ApiPropertyOptional({
    description: 'Latitude',
    example: -23.5505,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude',
    example: -46.6333,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Polígonos geográficos (GeoJSON)',
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
  })
  @IsObject()
  @IsOptional()
  polygons?: any;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Nível organizacional da localização',
    enum: LocationOrgLevelDto,
    example: LocationOrgLevelDto.CITY_COUNCIL,
    default: LocationOrgLevelDto.CITY_COUNCIL,
  })
  @IsEnum(LocationOrgLevelDto)
  @IsOptional()
  orgLevel?: LocationOrgLevelDto;
}
