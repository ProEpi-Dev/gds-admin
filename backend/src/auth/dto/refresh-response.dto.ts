import { ApiProperty } from '@nestjs/swagger';

export class RefreshResponseDto {
  @ApiProperty({
    description: 'Novo JWT de acesso',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Novo refresh token (rotação)',
    example: 'a1b2c3...',
  })
  refreshToken: string;
}
