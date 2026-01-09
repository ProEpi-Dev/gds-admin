import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { form_version_access_type } from '@prisma/client';

export class FormVersionResponseDto {
  @ApiProperty({ description: 'ID da versão do formulário', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID do formulário', example: 1 })
  formId: number;

  @ApiProperty({ description: 'Número da versão', example: 1 })
  versionNumber: number;

  @ApiProperty({
    description: 'Tipo de acesso da versão',
    enum: form_version_access_type,
    example: 'PUBLIC',
  })
  accessType: form_version_access_type;

  @ApiProperty({
    description: 'Definição do formulário (JSON)',
    example: { fields: [{ name: 'campo1', type: 'text' }] },
  })
  definition: any;

  @ApiProperty({ description: 'Status ativo', example: true })
  active: boolean;

  @ApiProperty({ description: 'Data de criação', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Nota mínima para aprovação (0-100)',
    example: 70.0,
  })
  passingScore?: number | null;

  @ApiPropertyOptional({
    description: 'Limite de tentativas (NULL = ilimitado)',
    example: 3,
  })
  maxAttempts?: number | null;

  @ApiPropertyOptional({
    description: 'Tempo limite em minutos (NULL = sem limite)',
    example: 30,
  })
  timeLimitMinutes?: number | null;

  @ApiPropertyOptional({
    description: 'Mostrar feedback após resposta',
    example: true,
    default: true,
  })
  showFeedback?: boolean;

  @ApiPropertyOptional({
    description: 'Randomizar ordem das questões',
    example: false,
    default: false,
  })
  randomizeQuestions?: boolean;
}

