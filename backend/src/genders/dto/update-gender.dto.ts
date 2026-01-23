import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateGenderDto {
  @ApiProperty({
    description: 'Nome do gênero',
    example: 'Masculino',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiProperty({
    description: 'Status ativo',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
