import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { ParticipationLoginDto } from './participation-login.dto';

export class SignupResponseDto {
  @ApiProperty({
    description: 'Dados do usuário criado',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiPropertyOptional({
    description:
      'Quando true, o contexto exige confirmação de email; accessToken e refreshToken não são emitidos até a verificação.',
  })
  emailVerificationRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Token de acesso JWT (omitido se emailVerificationRequired)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Refresh token opaco (omitido se emailVerificationRequired)',
    example: 'a1b2c3d4e5f6...',
  })
  refreshToken?: string;

  @ApiProperty({
    description:
      'Participação criada (mesmo formato do login, incluindo nome do contexto)',
    type: ParticipationLoginDto,
  })
  participation: ParticipationLoginDto;
}
