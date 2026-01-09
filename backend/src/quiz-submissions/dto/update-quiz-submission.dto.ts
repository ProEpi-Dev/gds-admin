import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class UpdateQuizSubmissionDto {
  @ApiPropertyOptional({
    description: 'Respostas do quiz (JSON)',
    example: { question1: 'answer1', question2: 'answer2' },
  })
  @IsObject()
  @IsOptional()
  quizResponse?: any;

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
  @IsOptional()
  timeSpentSeconds?: number;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

