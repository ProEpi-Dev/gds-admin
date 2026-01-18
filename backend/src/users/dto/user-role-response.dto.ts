import { ApiProperty } from '@nestjs/swagger';

class UserContextsDto {
  @ApiProperty({
    description: 'IDs dos contextos onde o usuário é manager',
    example: [1, 3],
    type: [Number],
  })
  asManager: number[];

  @ApiProperty({
    description: 'IDs dos contextos onde o usuário é participante',
    example: [2, 4],
    type: [Number],
  })
  asParticipant: number[];
}

export class UserRoleResponseDto {
  @ApiProperty({
    description: 'Indica se o usuário é manager de pelo menos um contexto',
    example: true,
  })
  isManager: boolean;

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
