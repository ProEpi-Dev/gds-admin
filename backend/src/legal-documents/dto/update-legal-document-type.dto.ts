import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class UpdateLegalDocumentTypeDto {
  @ApiProperty({
    description: 'Nome do tipo de documento',
    example: 'Termos de Uso Atualizados',
    maxLength: 100,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Descrição do tipo de documento',
    example: 'Termos e condições de uso da plataforma',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Indica se a aceitação é obrigatória',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiProperty({
    description: 'Indica se o tipo está ativo',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
