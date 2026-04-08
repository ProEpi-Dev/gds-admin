import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/** Contexto devolvido pelo setup (schema Swagger distinto de `contexts/dto/context-response.dto`). */
export class SetupContextResponseDto {
  @ApiProperty({ description: 'ID do contexto', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Nome do contexto',
    example: 'Contexto Principal',
  })
  name: string;

  @ApiProperty({
    description: 'Descrição do contexto',
    example: 'Contexto padrão do sistema',
  })
  description: string | null;

  @ApiProperty({
    description: 'Tipo de acesso',
    example: 'PUBLIC',
    enum: ['PUBLIC', 'PRIVATE'],
  })
  accessType: string;

  @ApiProperty({ description: 'Status ativo', example: true })
  active: boolean;
}

export class SetupResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Sistema inicializado com sucesso',
  })
  message: string;

  @ApiProperty({
    description: 'Contexto padrão criado',
    type: SetupContextResponseDto,
  })
  context: SetupContextResponseDto;

  @ApiProperty({
    description: 'Usuário manager padrão criado',
    type: UserResponseDto,
  })
  manager: UserResponseDto;

  @ApiProperty({
    description: 'ID da participation criada para o manager no contexto',
    example: 1,
  })
  participationId: number;
}
