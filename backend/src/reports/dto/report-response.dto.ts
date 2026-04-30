import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { report_type_enum } from '@prisma/client';
import { ReportIntegrationSummaryDto } from './report-integration-summary.dto';

export class ReportResponseDto {
  @ApiProperty({ description: 'ID do report', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID da participação', example: 1 })
  participationId: number;

  @ApiProperty({ description: 'ID da versão do formulário', example: 1 })
  formVersionId: number;

  @ApiProperty({
    description: 'Tipo do report',
    enum: report_type_enum,
    example: 'POSITIVE',
  })
  reportType: report_type_enum;

  @ApiPropertyOptional({
    description:
      'Localização da ocorrência (JSON). Omitida em `GET /reports?view=app`.',
    example: { latitude: -23.5505, longitude: -46.6333 },
  })
  occurrenceLocation?: any | null;

  @ApiPropertyOptional({
    description:
      'Resposta do formulário (JSON). Omitida em `GET /reports?view=app` — use previewText ou `GET /reports/:id`.',
    example: { campo1: 'valor1', campo2: 'valor2' },
  })
  formResponse?: any | null;

  @ApiProperty({ description: 'Status ativo', example: true })
  active: boolean;

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description:
      'Texto de preview da listagem no app (definição: listPreviewFieldName). Só com `view=app`.',
  })
  previewText?: string;

  @ApiPropertyOptional({
    description:
      'Resumo da integração externa para o report. Só com `view=app`, participante, config ativa e módulo community_signal.',
    type: ReportIntegrationSummaryDto,
  })
  integrationSummary?: ReportIntegrationSummaryDto | null;
}
