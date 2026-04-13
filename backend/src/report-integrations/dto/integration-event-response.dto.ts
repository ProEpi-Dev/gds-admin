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
