import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IntegrationConfigResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  contextId: number;

  @ApiProperty()
  version: number;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  baseUrlProduction: string | null;

  @ApiPropertyOptional()
  baseUrlHomologation: string | null;

  @ApiPropertyOptional({ description: 'Configuração de autenticação (sem segredos expostos)' })
  authConfig: Record<string, any> | null;

  @ApiProperty({ default: '/1' })
  templateId: string;

  @ApiProperty({ default: 'eventoIntegracaoTemplate' })
  templateFieldKey: string;

  @ApiProperty({ default: 'userId' })
  userIdFieldKey: string;

  @ApiProperty({ default: 'userEmail' })
  userEmailFieldKey: string;

  @ApiProperty({ default: 'userName' })
  userNameFieldKey: string;

  @ApiProperty({ default: 'userPhone' })
  userPhoneFieldKey: string;

  @ApiProperty({ default: 'userCountry' })
  userCountryFieldKey: string;

  @ApiProperty({ default: 'eventSourceId' })
  eventSourceIdFieldKey: string;

  @ApiProperty({ default: 'eventSourceLocation' })
  eventSourceLocationFieldKey: string;

  @ApiProperty({ default: 'eventSourceLocationId' })
  eventSourceLocationIdFieldKey: string;

  @ApiProperty()
  timeoutMs: number;

  @ApiProperty()
  maxRetries: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
