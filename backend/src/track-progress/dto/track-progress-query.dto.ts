import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { progress_status_enum } from '@prisma/client';

export class TrackProgressQueryDto {
  @ApiPropertyOptional({
    description: 'ID do usuário para filtrar',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  userId?: number;

  @ApiPropertyOptional({
    description: 'ID do ciclo da trilha para filtrar',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  trackCycleId?: number;

  @ApiPropertyOptional({
    description: 'ID da participação para filtrar',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  participationId?: number;

  @ApiPropertyOptional({
    description: 'Status do progresso para filtrar',
    enum: progress_status_enum,
    example: progress_status_enum.in_progress,
  })
  @IsOptional()
  @IsEnum(progress_status_enum)
  status?: progress_status_enum;
}
