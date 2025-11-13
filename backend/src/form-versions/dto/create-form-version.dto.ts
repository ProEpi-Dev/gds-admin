import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { form_version_access_type } from '@prisma/client';

export class CreateFormVersionDto {
  @ApiProperty({
    description: 'Tipo de acesso da versão',
    enum: form_version_access_type,
    example: 'PUBLIC',
  })
  @IsEnum(form_version_access_type)
  accessType: form_version_access_type;

  @ApiProperty({
    description: 'Definição do formulário (JSON)',
    example: { fields: [{ name: 'campo1', type: 'text' }] },
  })
  @IsObject()
  definition: any;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

