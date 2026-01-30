import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { track_cycle_status_enum } from '@prisma/client';

export class TrackCycleQueryDto {
  @ApiPropertyOptional({
    description: 'ID do contexto para filtrar',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  contextId?: number;

  @ApiPropertyOptional({
    description: 'ID da trilha para filtrar',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  trackId?: number;

  @ApiPropertyOptional({
    description: 'Status do ciclo para filtrar',
    enum: track_cycle_status_enum,
    example: track_cycle_status_enum.active,
  })
  @IsOptional()
  @IsEnum(track_cycle_status_enum)
  status?: track_cycle_status_enum;

  @ApiPropertyOptional({
    description: 'Incluir apenas ciclos ativos (active=true)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  active?: boolean;
}
