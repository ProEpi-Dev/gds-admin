import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { context_access_type } from '../../../generated/prisma/enums';

export class ContextResponseDto {
  @ApiProperty({ description: 'ID do contexto', example: 1 })
  id: number;

  @ApiPropertyOptional({ description: 'ID da localização associada', example: 1 })
  locationId: number | null;

  @ApiProperty({ description: 'Nome do contexto', example: 'Contexto de Saúde Pública' })
  name: string;

  @ApiPropertyOptional({
    description: 'Descrição do contexto',
    example: 'Contexto para monitoramento de saúde pública',
  })
  description: string | null;

  @ApiPropertyOptional({ description: 'Tipo do contexto', example: 'health' })
  type: string | null;

  @ApiProperty({
    description: 'Tipo de acesso do contexto',
    enum: context_access_type,
    example: 'PUBLIC',
  })
  accessType: context_access_type;

  @ApiProperty({ description: 'Status ativo', example: true })
  active: boolean;

  @ApiProperty({ description: 'Data de criação', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

