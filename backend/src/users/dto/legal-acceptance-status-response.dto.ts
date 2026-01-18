import { ApiProperty } from '@nestjs/swagger';

class LegalDocumentSummaryDto {
  @ApiProperty({
    description: 'ID do documento',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Código do tipo de documento',
    example: 'TERMS_OF_USE',
  })
  typeCode: string;

  @ApiProperty({
    description: 'Nome do tipo de documento',
    example: 'Termos de Uso',
  })
  typeName: string;

  @ApiProperty({
    description: 'Versão do documento',
    example: '2.0',
  })
  version: string;

  @ApiProperty({
    description: 'Título do documento',
    example: 'Termos de Uso da Plataforma',
  })
  title: string;

  @ApiProperty({
    description: 'Data de aceite (apenas para documentos aceitos)',
    example: '2026-01-16T10:00:00Z',
    required: false,
  })
  acceptedAt?: Date;
}

export class LegalAcceptanceStatusResponseDto {
  @ApiProperty({
    description: 'Indica se o usuário precisa aceitar novos termos',
    example: false,
  })
  needsAcceptance: boolean;

  @ApiProperty({
    description: 'Documentos pendentes de aceite',
    type: [LegalDocumentSummaryDto],
  })
  pendingDocuments: LegalDocumentSummaryDto[];

  @ApiProperty({
    description: 'Documentos já aceitos',
    type: [LegalDocumentSummaryDto],
  })
  acceptedDocuments: LegalDocumentSummaryDto[];
}
