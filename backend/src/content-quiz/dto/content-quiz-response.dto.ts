import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContentQuizResponseDto {
  @ApiProperty({ description: 'ID da associação', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID do conteúdo', example: 1 })
  contentId: number;

  @ApiProperty({ description: 'ID do formulário (quiz)', example: 1 })
  formId: number;

  @ApiProperty({ description: 'Ordem de exibição', example: 0 })
  displayOrder: number;

  @ApiProperty({ description: 'Se é obrigatório', example: false })
  isRequired: boolean;

  @ApiProperty({ description: 'Peso do quiz', example: 1.0 })
  weight: number;

  @ApiProperty({ description: 'Status ativo', example: true })
  active: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Dados do conteúdo associado',
  })
  content?: {
    id: number;
    title: string;
    reference: string;
  };

  @ApiPropertyOptional({
    description: 'Dados do formulário (quiz) associado',
  })
  form?: {
    id: number;
    title: string;
    reference: string | null;
    type: string;
  };
}
