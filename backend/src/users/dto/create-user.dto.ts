import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João Silva',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senha123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'ID do papel global do usuário (somente admin pode definir)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  roleId?: number;
}
