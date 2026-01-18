import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

class ParticipationInfoDto {
  @ApiProperty({
    description: 'ID da participação',
    example: 10,
  })
  id: number;

  @ApiProperty({
    description: 'ID do contexto',
    example: 1,
  })
  contextId: number;

  @ApiProperty({
    description: 'Data de início da participação',
    example: '2026-01-16',
  })
  startDate: string;
}

export class SignupResponseDto {
  @ApiProperty({
    description: 'Dados do usuário criado',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiProperty({
    description: 'Token de acesso JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Informações da participação criada',
    type: ParticipationInfoDto,
  })
  participation: ParticipationInfoDto;
}
