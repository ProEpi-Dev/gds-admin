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
    description: 'ID da localização de país',
    example: 10,
    required: false,
  })
  countryLocationId?: number;

  @ApiProperty({
    description: 'Identificador externo',
    example: '12345678900',
    required: false,
  })
  externalIdentifier?: string;

  @ApiProperty({
    description: 'Telefone',
    example: '+2389912345',
    required: false,
  })
  phone?: string;

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

  @ApiProperty({
    description:
      'Se o contexto possui formulário profile_extra ativo, o preenchimento passa a ser obrigatório',
    example: false,
  })
  profileExtraRequired: boolean;

  @ApiProperty({
    description:
      'Submissão alinhada à versão atual do formulário profile_extra (quando aplicável)',
    example: true,
  })
  profileExtraComplete: boolean;
}
