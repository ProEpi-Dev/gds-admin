import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'ID do gênero',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  genderId?: number;

  @ApiPropertyOptional({
    description: 'ID da localização',
    example: 150,
  })
  @IsInt()
  @IsOptional()
  locationId?: number;

  @ApiPropertyOptional({
    description: 'ID da localização de país',
    example: 10,
  })
  @IsInt()
  @IsOptional()
  countryLocationId?: number;

  @ApiPropertyOptional({
    description: 'Identificador externo (CPF, matrícula, etc)',
    example: '12345678900',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  externalIdentifier?: string;

  @ApiPropertyOptional({
    description: 'Telefone do usuário',
    example: '+2389912345',
    maxLength: 30,
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

}
