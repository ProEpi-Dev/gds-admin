import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { context_access_type } from '@prisma/client';

export class UpdateContextDto {
  @ApiPropertyOptional({
    description: 'Nome do contexto',
    example: 'Contexto de Saúde Pública',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'ID da localização associada',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  locationId?: number;

  @ApiPropertyOptional({
    description: 'Tipo de acesso do contexto',
    enum: context_access_type,
    example: 'PUBLIC',
  })
  @IsEnum(context_access_type)
  @IsOptional()
  accessType?: context_access_type;

  @ApiPropertyOptional({
    description: 'Descrição do contexto',
    example: 'Contexto para monitoramento de saúde pública',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Tipo do contexto',
    example: 'health',
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
