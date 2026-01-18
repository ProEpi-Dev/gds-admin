import { ApiProperty } from '@nestjs/swagger';

class ProfileDataDto {
  @ApiProperty({
    description: 'ID do gênero',
    example: 1,
    required: false,
  })
  genderId?: number;

  @ApiProperty({
    description: 'ID da localização',
    example: 150,
    required: false,
  })
  locationId?: number;

  @ApiProperty({
    description: 'Identificador externo',
    example: '12345678900',
    required: false,
  })
  externalIdentifier?: string;
}

export class ProfileStatusResponseDto {
  @ApiProperty({
    description: 'Indica se o perfil está completo',
    example: false,
  })
  isComplete: boolean;

  @ApiProperty({
    description: 'Lista de campos faltantes',
    example: ['genderId', 'locationId', 'externalIdentifier'],
    type: [String],
  })
  missingFields: string[];

  @ApiProperty({
    description: 'Dados atuais do perfil',
    type: ProfileDataDto,
  })
  profile: ProfileDataDto;
}
