import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ParentLocationDto {
  @ApiProperty({ description: 'ID da localização pai', example: 2 })
  id: number;

  @ApiProperty({ description: 'Nome da localização pai', example: 'Cidade Y' })
  name: string;

  @ApiPropertyOptional({
    description: 'Localização pai do parent (até 3 níveis)',
    type: () => ParentLocationDto,
  })
  parent?: ParentLocationDto;
}

export class LocationResponseDto {
  @ApiProperty({ description: 'ID da localização', example: 1 })
  id: number;

  @ApiPropertyOptional({ description: 'ID da localização pai', example: null })
  parentId: number | null;

  @ApiPropertyOptional({
    description: 'Informações da localização pai (hierarquia até 3 níveis)',
    type: () => ParentLocationDto,
  })
  parent?: ParentLocationDto;

  @ApiProperty({ description: 'Nome da localização', example: 'São Paulo' })
  name: string;

  @ApiPropertyOptional({ description: 'Latitude', example: -23.5505 })
  latitude: number | null;

  @ApiPropertyOptional({ description: 'Longitude', example: -46.6333 })
  longitude: number | null;

  @ApiPropertyOptional({
    description: 'Polígonos geográficos (GeoJSON)',
    example: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
  })
  polygons: any | null;

  @ApiProperty({ description: 'Status ativo', example: true })
  active: boolean;

  @ApiProperty({ description: 'Data de criação', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

