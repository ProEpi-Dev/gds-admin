import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsObject,
} from 'class-validator';

export class UpsertIntegrationConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  baseUrlProduction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  baseUrlHomologation?: string;

  @ApiPropertyOptional({ description: 'Configuração de autenticação (token estático, OAuth, etc.)' })
  @IsOptional()
  @IsObject()
  authConfig?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Valor do template de integração (ex.: /1)',
    default: '/1',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  templateId?: string;

  @ApiPropertyOptional({ default: 'eventoIntegracaoTemplate' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  templateFieldKey?: string;

  @ApiPropertyOptional({ default: 'userId' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userIdFieldKey?: string;

  @ApiPropertyOptional({ default: 'userEmail' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userEmailFieldKey?: string;

  @ApiPropertyOptional({ default: 'userName' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userNameFieldKey?: string;

  @ApiPropertyOptional({ default: 'userPhone' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userPhoneFieldKey?: string;

  @ApiPropertyOptional({ default: 'userCountry' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userCountryFieldKey?: string;

  @ApiPropertyOptional({ default: 'eventSourceId' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  eventSourceIdFieldKey?: string;

  @ApiPropertyOptional({ default: 'eventSourceLocation' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  eventSourceLocationFieldKey?: string;

  @ApiPropertyOptional({ default: 'eventSourceLocationId' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  eventSourceLocationIdFieldKey?: string;

  @ApiPropertyOptional({ default: 30000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(120000)
  timeoutMs?: number;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
