import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ParticipationReportStreakQueryDto {
  @ApiPropertyOptional({
    description:
      'Data inicial do período (YYYY-MM-DD). Filtra dias agregados no fuso America/Sao_Paulo (mesma convenção usada ao calcular participation_report_day).',
    example: '2026-03-01',
    type: String,
    format: 'date',
  })
  @IsString()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Data final do período (YYYY-MM-DD). Mesmo fuso que startDate (America/Sao_Paulo).',
    example: '2026-03-31',
    type: String,
    format: 'date',
  })
  @IsString()
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
