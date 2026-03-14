import { ApiProperty } from '@nestjs/swagger';

export class ReportDaySummaryDto {
  @ApiProperty({
    description: 'Dia em que houve report',
    example: '2026-03-14',
    type: String,
    format: 'date',
  })
  date: string;

  @ApiProperty({
    description: 'Quantidade total de reports no dia',
    example: 2,
  })
  reportCount: number;

  @ApiProperty({
    description: 'Quantidade de reports positivos no dia',
    example: 1,
  })
  positiveCount: number;

  @ApiProperty({
    description: 'Quantidade de reports negativos no dia',
    example: 1,
  })
  negativeCount: number;
}
