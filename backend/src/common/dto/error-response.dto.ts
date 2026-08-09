import { ApiProperty } from '@nestjs/swagger';

export class MaintenanceInfoDto {
  @ApiProperty({
    description: 'Grau da janela em vigor',
    enum: ['banner', 'read_only', 'full'],
    example: 'full',
  })
  mode: 'banner' | 'read_only' | 'full';

  @ApiProperty({
    description: 'Título da janela, já resolvido pelo Accept-Language',
    example: 'Manutenção programada',
  })
  title: string;

  @ApiProperty({
    description: 'Início da janela (UTC, ISO 8601)',
    example: '2026-08-10T02:00:00.000Z',
  })
  startsAt: string;

  @ApiProperty({
    description:
      'Fim previsto (UTC, ISO 8601). Nulo quando não há previsão de retorno.',
    example: '2026-08-10T06:00:00.000Z',
    nullable: true,
  })
  endsAt: string | null;
}

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

  @ApiProperty({
    description:
      'Presente apenas quando code é MAINTENANCE. Permite ao cliente distinguir a indisponibilidade anunciada de um 503 incidental do proxy.',
    type: MaintenanceInfoDto,
    required: false,
  })
  maintenance?: MaintenanceInfoDto;
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Informações do erro', type: ErrorDetailDto })
  error: ErrorDetailDto;
}
