import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CompleteQuizDto } from './complete-quiz.dto';

describe('CompleteQuizDto', () => {
  it('converte quizSubmissionId de string e valida', async () => {
    const instance = plainToInstance(CompleteQuizDto, {
      quizSubmissionId: '12',
    });
    expect(instance.quizSubmissionId).toBe(12);
    expect(await validate(instance)).toHaveLength(0);
  });
});
