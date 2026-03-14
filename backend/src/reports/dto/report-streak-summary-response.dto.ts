import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportStreakSummaryResponseDto {
  @ApiProperty({ description: 'ID da participação', example: 10 })
  participationId: number;

  @ApiProperty({ description: 'ID do usuário', example: 5 })
  userId: number;

  @ApiProperty({ description: 'Nome do usuário', example: 'Maria Silva' })
  userName: string;

  @ApiProperty({
    description: 'E-mail do usuário',
    example: 'maria@example.com',
  })
  userEmail: string;

  @ApiProperty({ description: 'Status ativo da participação', example: true })
  active: boolean;

  @ApiProperty({
    description: 'Ofensiva atual em dias consecutivos',
    example: 7,
  })
  currentStreak: number;

  @ApiProperty({ description: 'Maior ofensiva já registrada', example: 15 })
  longestStreak: number;

  @ApiProperty({
    description: 'Quantidade total de dias distintos com report',
    example: 23,
  })
  reportedDaysCount: number;

  @ApiPropertyOptional({
    description: 'Último dia com report',
    example: '2026-03-14',
    type: String,
    format: 'date',
    nullable: true,
  })
  lastReportedDate: string | null;

  @ApiPropertyOptional({
    description: 'Dia de início da ofensiva atual',
    example: '2026-03-08',
    type: String,
    format: 'date',
    nullable: true,
  })
  currentStreakStartDate: string | null;
}
