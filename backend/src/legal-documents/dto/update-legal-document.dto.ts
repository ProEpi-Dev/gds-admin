import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsDateString,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateLegalDocumentDto {
  @ApiProperty({
    description: 'ID do tipo de documento legal',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsOptional()
  typeId?: number;

  @ApiProperty({
    description: 'Número da versão',
    example: '2.0',
    required: false,
  })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({
    description: 'Título do documento',
    example: 'Termos de Uso v2.0',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Conteúdo HTML do documento',
    example: '<p>Termos e condições atualizados...</p>',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'Data de vigência do documento',
    example: '2026-02-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @ApiProperty({
    description: 'Indica se o documento está ativo',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
