import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNumber,
  MinLength,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'Maria Santos',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'maria@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senha123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'ID do contexto público que o usuário deseja participar',
    example: 1,
  })
  @IsNumber()
  contextId: number;

  @ApiProperty({
    description: 'IDs dos documentos legais aceitos pelo usuário',
    example: [1, 2],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  acceptedLegalDocumentIds: number[];
}
