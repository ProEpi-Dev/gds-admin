import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ParticipationReportStreakQueryDto {
  @ApiPropertyOptional({
    description: 'Data inicial do período (formato: YYYY-MM-DD)',
    example: '2026-03-01',
    type: String,
    format: 'date',
  })
  @IsString()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data final do período (formato: YYYY-MM-DD)',
    example: '2026-03-31',
    type: String,
    format: 'date',
  })
  @IsString()
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
