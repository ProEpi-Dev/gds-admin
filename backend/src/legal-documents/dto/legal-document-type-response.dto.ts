import { ApiProperty } from '@nestjs/swagger';

export class LegalDocumentTypeResponseDto {
  @ApiProperty({
    description: 'ID do tipo de documento',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Código único do tipo',
    example: 'TERMS_OF_USE',
  })
  code: string;

  @ApiProperty({
    description: 'Nome do tipo de documento',
    example: 'Termos de Uso',
  })
  name: string;

  @ApiProperty({
    description: 'Descrição do tipo de documento',
    example: 'Termos e condições de uso da plataforma',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Indica se o aceite é obrigatório no signup',
    example: true,
  })
  isRequired: boolean;

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
