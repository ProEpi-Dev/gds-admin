import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Número da página',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Tamanho da página',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 20;
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Número da página atual', example: 1 })
  page: number;

  @ApiProperty({ description: 'Tamanho da página', example: 20 })
  pageSize: number;

  @ApiProperty({ description: 'Total de páginas', example: 5 })
  totalPages: number;

  @ApiProperty({ description: 'Total de itens', example: 100 })
  totalItems: number;
}

export class PaginationLinksDto {
  @ApiProperty({
    description: 'Link para primeira página',
    example: '/users?page=1&pageSize=20',
  })
  first: string;

  @ApiProperty({
    description: 'Link para última página',
    example: '/users?page=5&pageSize=20',
  })
  last: string;

  @ApiPropertyOptional({
    description: 'Link para página anterior',
    example: '/users?page=2&pageSize=20',
    nullable: true,
  })
  prev: string | null;

  @ApiPropertyOptional({
    description: 'Link para próxima página',
    example: '/users?page=4&pageSize=20',
    nullable: true,
  })
  next: string | null;
}
