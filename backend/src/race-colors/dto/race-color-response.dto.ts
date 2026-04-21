import { ApiProperty } from '@nestjs/swagger';

export class RaceColorResponseDto {
  @ApiProperty({
    description: 'ID da raça/cor',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nome da raça/cor',
    example: 'Parda',
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
