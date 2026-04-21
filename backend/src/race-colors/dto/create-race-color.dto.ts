import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRaceColorDto {
  @ApiProperty({
    description: 'Nome da raça/cor',
    example: 'Parda',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  name: string;
}
