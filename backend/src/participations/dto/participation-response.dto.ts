import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ParticipationResponseDto {
  @ApiProperty({ description: 'ID da participação', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID do usuário', example: 1 })
  userId: number;

  @ApiProperty({ description: 'ID do contexto', example: 1 })
  contextId: number;

  @ApiProperty({
    description: 'Data de início da participação',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  startDate: Date;

  @ApiPropertyOptional({
    description: 'Data de término da participação',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  endDate: Date | null;

  @ApiProperty({ description: 'Status ativo', example: true })
  active: boolean;

  @ApiProperty({ description: 'Data de criação', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

