import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsEmail,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateParticipationDto {
  @ApiPropertyOptional({
    description: 'ID do usuário existente. Se não informado, os campos newUser* são obrigatórios.',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  userId?: number;

  // ── Criação inline de usuário (quando userId não é informado) ──────────

  @ApiPropertyOptional({ description: 'Nome do novo usuário', example: 'João Silva' })
  @ValidateIf((o) => !o.userId)
  @IsString()
  @MinLength(1)
  newUserName?: string;

  @ApiPropertyOptional({ description: 'E-mail do novo usuário', example: 'joao@example.com' })
  @ValidateIf((o) => !o.userId)
  @IsEmail()
  newUserEmail?: string;

  @ApiPropertyOptional({ description: 'Senha do novo usuário (mín. 6 caracteres)', example: 'senha123' })
  @ValidateIf((o) => !o.userId)
  @IsString()
  @MinLength(6)
  newUserPassword?: string;

  @ApiProperty({
    description: 'ID do contexto',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  contextId: number;

  @ApiProperty({
    description: 'Data de início da participação',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    description: 'Data de término da participação',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'ID do papel a atribuir à participação. Se não informado, usa o papel "participant" padrão.',
    example: 2,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  roleId?: number;
}
