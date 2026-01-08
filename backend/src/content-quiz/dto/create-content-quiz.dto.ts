import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContentQuizDto {
  @ApiProperty({
    description: 'ID do conteúdo',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  contentId: number;

  @ApiProperty({
    description: 'ID do formulário (quiz)',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  formId: number;

  @ApiPropertyOptional({
    description: 'Ordem de exibição do quiz no conteúdo',
    example: 0,
    default: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Se o quiz é obrigatório para o conteúdo',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Peso do quiz (para cálculo de nota final)',
    example: 1.0,
    default: 1.0,
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
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

