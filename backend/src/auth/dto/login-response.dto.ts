import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { ParticipationLoginDto } from './participation-login.dto';
import { DefaultFormDto } from './default-form.dto';

export class LoginResponseDto {
  @ApiProperty({
    description: 'Token JWT de autenticação (acesso)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Refresh token opaco; use em POST /v1/auth/refresh quando o JWT expirar',
    example: 'a1b2c3d4e5f6...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Dados do usuário autenticado',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiPropertyOptional({
    description: 'Participação ativa do usuário',
    type: ParticipationLoginDto,
    nullable: true,
  })
  participation: ParticipationLoginDto | null;

  @ApiPropertyOptional({
    description: 'Formulários padrão (DEFAULT_SIGNAL_FORM e DEFAULT_QUIZ_FORM)',
    type: [DefaultFormDto],
  })
  defaultForms?: DefaultFormDto[];
}
