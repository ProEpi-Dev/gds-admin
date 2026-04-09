import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { ParticipationLoginDto } from './participation-login.dto';

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
    description: 'Refresh token opaco',
    example: 'a1b2c3d4e5f6...',
  })
  refreshToken: string;

  @ApiProperty({
    description:
      'Participação criada (mesmo formato do login, incluindo nome do contexto)',
    type: ParticipationLoginDto,
  })
  participation: ParticipationLoginDto;
}
