import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportDaySummaryDto } from './report-day-summary.dto';
import { ReportStreakSummaryResponseDto } from './report-streak-summary-response.dto';

export class ParticipationReportStreakResponseDto extends ReportStreakSummaryResponseDto {
  @ApiPropertyOptional({
    description: 'Data inicial efetiva do período retornado',
    example: '2026-03-01',
    type: String,
    format: 'date',
    nullable: true,
  })
  periodStartDate: string | null;

  @ApiPropertyOptional({
    description: 'Data final efetiva do período retornado',
    example: '2026-03-31',
    type: String,
    format: 'date',
    nullable: true,
  })
  periodEndDate: string | null;

  @ApiProperty({
    description: 'Quantidade de dias com report dentro do período retornado',
    example: 10,
  })
  reportedDaysInRangeCount: number;

  @ApiProperty({
    description: 'Dias em que houve report, com contadores agregados',
    type: [ReportDaySummaryDto],
  })
  reportedDays: ReportDaySummaryDto[];
}
