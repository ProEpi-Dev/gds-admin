import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'ID do usuário', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome do usuário', example: 'João Silva' })
  name: string;

  @ApiProperty({ description: 'Email do usuário', example: 'joao@example.com' })
  email: string;

  @ApiProperty({ description: 'Status ativo', example: true })
  active: boolean;

  @ApiPropertyOptional({ description: 'ID do gênero', example: 1 })
  genderId?: number;

  @ApiPropertyOptional({ description: 'ID da localização', example: 150 })
  locationId?: number;

  @ApiPropertyOptional({
    description: 'Identificador externo',
    example: '12345678900',
  })
  externalIdentifier?: string;

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
