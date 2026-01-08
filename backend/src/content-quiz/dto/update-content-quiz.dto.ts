import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateContentQuizDto {
  @ApiPropertyOptional({
    description: 'Ordem de exibição do quiz no conteúdo',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Se o quiz é obrigatório para o conteúdo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Peso do quiz (para cálculo de nota final)',
    example: 2.0,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  weight?: number;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

