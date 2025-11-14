import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { ParticipationLoginDto } from './participation-login.dto';

export class LoginResponseDto {
  @ApiProperty({
    description: 'Token JWT de autenticação',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

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
}

