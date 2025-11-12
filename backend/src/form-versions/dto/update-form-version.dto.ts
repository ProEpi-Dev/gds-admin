import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { form_version_access_type } from '../../../generated/prisma/enums';

export class UpdateFormVersionDto {
  @ApiPropertyOptional({
    description: 'Tipo de acesso da versão',
    enum: form_version_access_type,
    example: 'PUBLIC',
  })
  @IsEnum(form_version_access_type)
  @IsOptional()
  accessType?: form_version_access_type;

  @ApiPropertyOptional({
    description: 'Definição do formulário (JSON)',
    example: { fields: [{ name: 'campo1', type: 'text' }] },
  })
  @IsObject()
  @IsOptional()
  definition?: any;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

