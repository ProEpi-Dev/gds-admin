import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  IsInt,
  IsPositive,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Nome do usuário',
    example: 'João Silva',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Email do usuário',
    example: 'joao@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Nova senha do usuário',
    example: 'novaSenha123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'ID do papel global do usuário (somente admin pode definir). Envie null para remover o papel.',
    example: 1,
    nullable: true,
  })
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  roleId?: number | null;
}
