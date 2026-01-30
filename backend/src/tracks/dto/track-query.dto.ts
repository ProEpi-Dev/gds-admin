import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TrackQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ID do contexto',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contextId?: number;
}
