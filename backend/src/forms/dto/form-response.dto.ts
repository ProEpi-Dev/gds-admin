import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { form_type_enum } from '@prisma/client';
import { ContextResponseDto } from '../../contexts/dto/context-response.dto';
import { FormVersionResponseDto } from '../../form-versions/dto/form-version-response.dto';

export class FormResponseDto {
  @ApiProperty({ description: 'ID do formulário', example: 1 })
  id: number;

  @ApiPropertyOptional({ description: 'ID do contexto associado', example: 1 })
  contextId: number | null;

  @ApiPropertyOptional({
    description: 'Objeto do contexto associado',
    type: ContextResponseDto,
  })
  context?: ContextResponseDto | null;

  @ApiProperty({ description: 'Título do formulário', example: 'Formulário de Vigilância' })
  title: string;

  @ApiPropertyOptional({ description: 'Referência do formulário', example: 'FORM-001' })
  reference: string | null;

  @ApiPropertyOptional({
    description: 'Descrição do formulário',
    example: 'Formulário para coleta de dados de vigilância',
  })
  description: string | null;

  @ApiProperty({
    description: 'Tipo do formulário',
    enum: form_type_enum,
    example: 'signal',
  })
  type: form_type_enum;

  @ApiProperty({ description: 'Status ativo', example: true })
  active: boolean;

  @ApiProperty({ description: 'Data de criação', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Última versão do formulário',
    type: FormVersionResponseDto,
  })
  latestVersion?: FormVersionResponseDto | null;
}

