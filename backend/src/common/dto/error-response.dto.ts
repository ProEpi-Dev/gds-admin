import { ApiProperty } from '@nestjs/swagger';

export class ErrorDetailDto {
  @ApiProperty({ description: 'Código do erro', example: 'VALIDATION_ERROR' })
  code: string;

  @ApiProperty({
    description: 'Mensagem de erro',
    example: 'Invalid input data',
  })
  message: string;

  @ApiProperty({
    description: 'Detalhes adicionais do erro',
    type: [Object],
    required: false,
  })
  details?: any[];
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Informações do erro', type: ErrorDetailDto })
  error: ErrorDetailDto;
}
