import { ApiProperty } from '@nestjs/swagger';

export class LegalDocumentResponseDto {
  @ApiProperty({
    description: 'ID do documento',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID do tipo de documento',
    example: 1,
  })
  typeId: number;

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
    description: 'Indica se o aceite é obrigatório',
    example: true,
  })
  isRequired: boolean;

  @ApiProperty({
    description: 'Versão do documento',
    example: '1.0',
  })
  version: string;

  @ApiProperty({
    description: 'Título do documento',
    example: 'Termos de Uso da Plataforma',
  })
  title: string;

  @ApiProperty({
    description: 'Conteúdo completo do documento',
    example: 'Este documento estabelece os termos...',
  })
  content: string;

  @ApiProperty({
    description: 'Data efetiva do documento',
    example: '2026-01-01',
  })
  effectiveDate: string;

  @ApiProperty({
    description: 'Status ativo',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'Data de criação',
    example: '2026-01-16T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2026-01-16T10:00:00Z',
  })
  updatedAt: Date;
}
