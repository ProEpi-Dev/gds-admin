import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenBodyDto {
  @ApiProperty({
    description: 'Refresh token recebido no login ou signup',
    example: 'a1b2c3...',
  })
  @IsString()
  @MinLength(32)
  refreshToken: string;
}
