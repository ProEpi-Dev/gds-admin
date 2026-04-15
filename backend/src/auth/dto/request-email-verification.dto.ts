import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestEmailVerificationDto {
  @ApiProperty({ description: 'Email da conta a confirmar' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
