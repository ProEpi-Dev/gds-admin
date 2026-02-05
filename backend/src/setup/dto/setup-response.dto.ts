import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class ContextResponseDto {
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

export class ContextManagerResponseDto {
  @ApiProperty({ description: 'ID do manager', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID do usuário', example: 1 })
  userId: number;

  @ApiProperty({ description: 'ID do contexto', example: 1 })
  contextId: number;

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
    type: ContextResponseDto,
  })
  context: ContextResponseDto;

  @ApiProperty({
    description: 'Usuário manager padrão criado',
    type: UserResponseDto,
  })
  manager: UserResponseDto;

  @ApiProperty({
    description: 'Relação context manager criada',
    type: ContextManagerResponseDto,
  })
  contextManager: ContextManagerResponseDto;
}
