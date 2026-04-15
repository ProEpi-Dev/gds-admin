import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token recebido por email' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
