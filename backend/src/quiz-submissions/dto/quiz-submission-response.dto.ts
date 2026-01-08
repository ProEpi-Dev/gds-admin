import { ApiProperty } from '@nestjs/swagger';

export class QuizSubmissionResponseDto {
  @ApiProperty({ description: 'ID da submissão', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID da participação', example: 1 })
  participationId: number;

  @ApiProperty({ description: 'ID da versão do formulário', example: 1 })
  formVersionId: number;

  @ApiProperty({ description: 'Respostas do quiz', example: {} })
  quizResponse: any;

  @ApiProperty({
    description: 'Resultados detalhados por questão',
    example: [
      {
        questionName: 'questao1',
        questionId: 'q1',
        isCorrect: true,
        pointsEarned: 10,
        pointsTotal: 10,
        userAnswer: 'A',
        correctAnswer: 'A',
        feedback: 'Parabéns!',
      },
    ],
    nullable: true,
  })
  questionResults: Array<{
    questionName: string;
    questionId?: string;
    isCorrect: boolean;
    pointsEarned: number;
    pointsTotal: number;
    userAnswer: any;
    correctAnswer: any;
    feedback?: string;
  }> | null;

  @ApiProperty({ description: 'Nota final (0-100)', example: 85.5, nullable: true })
  score: number | null;

  @ApiProperty({ description: 'Percentual de acertos', example: 85.5, nullable: true })
  percentage: number | null;

  @ApiProperty({ description: 'Se foi aprovado', example: true, nullable: true })
  isPassed: boolean | null;

  @ApiProperty({ description: 'Número da tentativa', example: 1 })
  attemptNumber: number;

  @ApiProperty({ description: 'Tempo gasto em segundos', example: 1800, nullable: true })
  timeSpentSeconds: number | null;

  @ApiProperty({ description: 'Data/hora de início' })
  startedAt: Date;

  @ApiProperty({ description: 'Data/hora de conclusão', nullable: true })
  completedAt: Date | null;

  @ApiProperty({ description: 'Status ativo', example: true })
  active: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Dados da participação',
    nullable: true,
  })
  participation?: {
    id: number;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  };

  @ApiProperty({
    description: 'Dados da versão do formulário',
    nullable: true,
  })
  formVersion?: {
    id: number;
    versionNumber: number;
    form?: {
      id: number;
      title: string;
      reference: string;
    };
  };
}

