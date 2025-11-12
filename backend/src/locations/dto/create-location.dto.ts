import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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
    example: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
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
}

