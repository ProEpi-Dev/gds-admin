import { ApiProperty } from '@nestjs/swagger';

class ContextInfoDto {
  @ApiProperty({ description: 'ID do contexto', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome do contexto', example: 'Contexto Principal' })
  name: string;
}

class UserContextsDto {
  @ApiProperty({
    description: 'Contextos onde o usuário é manager ou content_manager',
    type: [ContextInfoDto],
  })
  asManager: ContextInfoDto[];

  @ApiProperty({
    description: 'Contextos onde o usuário é participante',
    type: [ContextInfoDto],
  })
  asParticipant: ContextInfoDto[];
}

export class UserRoleResponseDto {
  @ApiProperty({
    description: 'Indica se o usuário é administrador global (user.role_id = admin)',
    example: false,
  })
  isAdmin: boolean;

  @ApiProperty({
    description: 'Indica se o usuário é manager de pelo menos um contexto',
    example: true,
  })
  isManager: boolean;

  @ApiProperty({
    description: 'Indica se o usuário é content_manager de pelo menos um contexto',
    example: false,
  })
  isContentManager: boolean;

  @ApiProperty({
    description: 'Indica se o usuário é participante de pelo menos um contexto',
    example: true,
  })
  isParticipant: boolean;

  @ApiProperty({
    description: 'Lista de IDs dos contextos agrupados por papel',
    type: UserContextsDto,
  })
  contexts: UserContextsDto;
}
