import { ApiProperty } from '@nestjs/swagger';

export class ContextManagerResponseDto {
  @ApiProperty({ description: 'ID do context manager', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID do usuário', example: 1 })
  userId: number;

  @ApiProperty({ description: 'ID do contexto', example: 1 })
  contextId: number;

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
}
