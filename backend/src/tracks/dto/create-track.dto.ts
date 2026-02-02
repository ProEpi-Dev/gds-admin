import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SequenceDto {
  @ApiPropertyOptional({ description: 'ID da sequência (para edição)' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiPropertyOptional({ description: 'ID do conteúdo' })
  @IsOptional()
  @IsInt()
  content_id?: number;

  @ApiPropertyOptional({ description: 'ID do formulário' })
  @IsOptional()
  @IsInt()
  form_id?: number;

  @ApiProperty({ description: 'Ordem da sequência', example: 0 })
  @IsInt()
  @Min(0)
  order: number;
}

class SectionDto {
  @ApiPropertyOptional({ description: 'ID da seção (para edição)' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ description: 'Nome da seção', example: 'Introdução' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Ordem da seção', example: 0 })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({ description: 'Sequências da seção', type: [SequenceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SequenceDto)
  sequences: SequenceDto[];
}

export class CreateTrackDto {
  @ApiPropertyOptional({
    description:
      'ID do contexto (opcional). Se não informado, a trilha será criada sem contexto.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  context_id?: number;

  @ApiProperty({ description: 'Nome da trilha', example: 'JavaScript Básico' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Descrição da trilha',
    example: 'Aprenda os fundamentos do JavaScript',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Controlar período de acesso',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  control_period?: boolean;

  @ApiPropertyOptional({
    description: 'Data de início',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Data de término',
    example: '2024-12-31T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Exibir após conclusão',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  show_after_completion?: boolean;

  @ApiPropertyOptional({
    description: 'Possui progressão',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  has_progression?: boolean;

  @ApiPropertyOptional({ description: 'Seções da trilha', type: [SectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections?: SectionDto[];
}
