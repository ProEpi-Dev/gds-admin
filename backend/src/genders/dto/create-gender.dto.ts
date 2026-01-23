import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGenderDto {
  @ApiProperty({
    description: 'Nome do gênero',
    example: 'Masculino',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  name: string;
}
