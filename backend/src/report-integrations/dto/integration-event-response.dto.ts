import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IntegrationMessageResponseDto {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional()
  externalMessageId: string | null;

  @ApiProperty({ enum: ['inbound', 'outbound'] })
  direction: 'inbound' | 'outbound';

  @ApiProperty()
  body: string;

  @ApiPropertyOptional()
  author: string | null;

  @ApiPropertyOptional()
  remoteCreatedAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

/** Desfecho real no sistema externo (Ephem), relido via `GET /eventos/{id}`. */
export class IntegrationRemoteStatusDto {
  @ApiPropertyOptional({
    description:
      'Status no Ephem (ex.: CRIADO, PROCESSADO, ERRO). Null se indisponível.',
  })
  remoteStatus: string | null;

  @ApiPropertyOptional({
    description:
      'Mensagem do Ephem (ex.: "signal criado" ou detalhe do erro de validação).',
  })
  remoteStatusMessage: string | null;

  @ApiPropertyOptional({ description: 'ID do signal criado no Ephem, se houver.' })
  remoteSignalId: number | null;
}

export class IntegrationEventResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  reportId: number;

  @ApiPropertyOptional()
  externalEventId: string | null;

  @ApiProperty({
    enum: ['pending', 'processing', 'sent', 'failed'],
  })
  status: 'pending' | 'processing' | 'sent' | 'failed';

  @ApiProperty()
  environment: string;

  @ApiProperty()
  attemptCount: number;

  @ApiPropertyOptional()
  lastAttemptAt: Date | null;

  @ApiPropertyOptional()
  lastError: string | null;

  /** Estágio do sinal na Ephem (`dados.signal_stage_state_id`: [id, rótulo]). */
  @ApiPropertyOptional()
  externalSignalStageId: number | null;

  @ApiPropertyOptional()
  externalSignalStageLabel: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [IntegrationMessageResponseDto] })
  messages?: IntegrationMessageResponseDto[];
}
