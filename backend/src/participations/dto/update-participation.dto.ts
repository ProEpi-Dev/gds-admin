import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateParticipationDto {
  @ApiPropertyOptional({
    description: 'ID do usuário',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({
    description: 'ID do contexto',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  contextId?: number;

  @ApiPropertyOptional({
    description: 'Data de início da participação',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data de término da participação',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Modo treinamento para integração externa (homologação vs produção)',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  integrationTrainingMode?: boolean;

  @ApiPropertyOptional({
    description:
      'Confirma mover o histórico ao trocar de contexto. O contexto de um report ' +
      'não fica no report: é derivado da participação. Trocar o contexto move ' +
      'retroativamente todos os reports, quizzes e trilhas da pessoa, que somem ' +
      'do contexto antigo e aparecem no novo como se sempre tivessem estado lá. ' +
      'Sem esta confirmação, a troca é recusada quando já existe histórico.',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  moveExistingHistory?: boolean;
}
