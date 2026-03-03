import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({ description: 'ID do papel', example: 1 })
  id: number;

  @ApiProperty({ description: 'Código único do papel', example: 'manager' })
  code: string;

  @ApiProperty({ description: 'Nome do papel', example: 'Gerente' })
  name: string;

  @ApiPropertyOptional({
    description: 'Descrição do papel',
    example: 'Gerencia o contexto',
  })
  description: string | null;

  @ApiPropertyOptional({
    description: 'Escopo do papel (global ou context)',
    example: 'context',
  })
  scope: string | null;

  @ApiProperty({ description: 'Status ativo', example: true })
  active: boolean;
}
