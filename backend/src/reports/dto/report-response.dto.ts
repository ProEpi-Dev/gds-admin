import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { report_type_enum } from '../../../generated/prisma/enums';

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
    description: 'Localização da ocorrência (JSON)',
    example: { latitude: -23.5505, longitude: -46.6333 },
  })
  occurrenceLocation: any | null;

  @ApiProperty({
    description: 'Resposta do formulário (JSON)',
    example: { campo1: 'valor1', campo2: 'valor2' },
  })
  formResponse: any;

  @ApiProperty({ description: 'Status ativo', example: true })
  active: boolean;

  @ApiProperty({ description: 'Data de criação', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

