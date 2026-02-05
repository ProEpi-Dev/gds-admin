import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuizSubmissionDto {
  @ApiProperty({
    description: 'ID da participação',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  participationId: number;

  @ApiProperty({
    description: 'ID da versão do formulário (quiz)',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  formVersionId: number;

  @ApiProperty({
    description: 'Respostas do quiz (JSON)',
    example: { question1: 'answer1', question2: 'answer2' },
  })
  @IsObject()
  quizResponse: any;

  @ApiProperty({
    description: 'Data/hora de início do quiz',
    example: '2024-01-01T10:00:00Z',
  })
  @IsDateString()
  startedAt: string;

  @ApiPropertyOptional({
    description: 'Data/hora de conclusão do quiz',
    example: '2024-01-01T10:30:00Z',
  })
  @IsDateString()
  @IsOptional()
  completedAt?: string;

  @ApiPropertyOptional({
    description: 'Tempo gasto em segundos',
    example: 1800,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  timeSpentSeconds?: number;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
    default: true,
  })
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    description:
      'ID do progresso da trilha. Quando informado junto com sequenceId, a submissão é vinculada ao sequence_progress e a sequência é marcada como concluída (operação atômica).',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  trackProgressId?: number;

  @ApiPropertyOptional({
    description:
      'ID da sequência no ciclo. Usado junto com trackProgressId para vincular a submissão ao progresso da trilha.',
    example: 2,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  sequenceId?: number;
}
