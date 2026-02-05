import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Senha atual do usuário',
    example: 'senhaAtual123',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'Nova senha do usuário',
    example: 'novaSenha123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'A nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
  })
  newPassword: string;
}
