import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteQuizDto {
  @ApiProperty({
    description:
      'ID da submissão do quiz a ser vinculada ao progresso da sequência',
    example: 19,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quizSubmissionId: number;
}
