import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class SetupDto {
  @ApiProperty({
    description: 'Nome do usuário manager padrão',
    example: 'Admin',
  })
  @IsString()
  managerName: string;

  @ApiProperty({
    description: 'Email do usuário manager padrão',
    example: 'admin@example.com',
  })
  @IsEmail()
  managerEmail: string;

  @ApiProperty({
    description: 'Senha do usuário manager padrão',
    example: 'admin123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  managerPassword: string;

  @ApiPropertyOptional({
    description: 'Nome do contexto padrão',
    example: 'Contexto Principal',
    default: 'Contexto Principal',
  })
  @IsString()
  @IsOptional()
  contextName?: string;

  @ApiPropertyOptional({
    description: 'Descrição do contexto padrão',
    example: 'Contexto padrão do sistema',
  })
  @IsString()
  @IsOptional()
  contextDescription?: string;
}
