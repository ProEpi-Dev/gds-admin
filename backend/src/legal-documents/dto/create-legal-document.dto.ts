import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsDateString,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateLegalDocumentDto {
  @ApiProperty({
    description: 'ID do tipo de documento legal',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  typeId: number;

  @ApiProperty({
    description: 'Número da versão',
    example: '1.0',
  })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({
    description: 'Título do documento',
    example: 'Termos de Uso v1.0',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Conteúdo HTML do documento',
    example: '<p>Termos e condições...</p>',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Data de vigência do documento',
    example: '2026-01-18',
  })
  @IsDateString()
  effectiveDate: string;

  @ApiProperty({
    description: 'Indica se o documento está ativo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
