import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Subconjunto da integração para lista do app (`view=app`). */
export class ReportIntegrationSummaryDto {
  @ApiProperty({
    enum: ['pending', 'processing', 'sent', 'failed'],
  })
  status: 'pending' | 'processing' | 'sent' | 'failed';

  @ApiPropertyOptional({
    description: 'Rótulo do estágio no sistema externo (ex.: Informado)',
  })
  externalSignalStageLabel: string | null;

  @ApiPropertyOptional()
  externalSignalStageId: number | null;
}
