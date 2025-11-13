import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { form_type_enum } from '@prisma/client';

export class CreateFormDto {
  @ApiProperty({
    description: 'Título do formulário',
    example: 'Formulário de Vigilância',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Tipo do formulário',
    enum: form_type_enum,
    example: 'signal',
  })
  @IsEnum(form_type_enum)
  type: form_type_enum;

  @ApiPropertyOptional({
    description: 'Referência do formulário',
    example: 'FORM-001',
  })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Descrição do formulário',
    example: 'Formulário para coleta de dados de vigilância',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

