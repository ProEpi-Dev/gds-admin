import { ApiProperty } from '@nestjs/swagger';

export class GenderResponseDto {
  @ApiProperty({
    description: 'ID do gênero',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nome do gênero',
    example: 'Masculino',
  })
  name: string;

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
