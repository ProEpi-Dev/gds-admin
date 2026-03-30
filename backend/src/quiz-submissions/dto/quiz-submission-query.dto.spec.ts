import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuizSubmissionQueryDto } from './quiz-submission-query.dto';

describe('QuizSubmissionQueryDto', () => {
  describe('transform (@Type number)', () => {
    it('deve converter participationId de string para number', () => {
      const instance = plainToInstance(QuizSubmissionQueryDto, {
        participationId: '42',
      });
      expect(instance.participationId).toBe(42);
      expect(typeof instance.participationId).toBe('number');
    });

    it('deve converter formVersionId de string para number', () => {
      const instance = plainToInstance(QuizSubmissionQueryDto, {
        formVersionId: '7',
      });
      expect(instance.formVersionId).toBe(7);
    });

    it('deve converter formId de string para number', () => {
      const instance = plainToInstance(QuizSubmissionQueryDto, {
        formId: '99',
      });
      expect(instance.formId).toBe(99);
    });

    it('deve converter contextId de string para number', () => {
      const instance = plainToInstance(QuizSubmissionQueryDto, {
        contextId: '3',
      });
      expect(instance.contextId).toBe(3);
    });
  });

  describe('transform (@Transform boolean)', () => {
    it('deve mapear active "true" / "false" e repassar outros valores', () => {
      expect(
        plainToInstance(QuizSubmissionQueryDto, { active: 'true' }).active,
      ).toBe(true);
      expect(
        plainToInstance(QuizSubmissionQueryDto, { active: 'false' }).active,
      ).toBe(false);
      expect(
        plainToInstance(QuizSubmissionQueryDto, { active: true }).active,
      ).toBe(true);
      expect(plainToInstance(QuizSubmissionQueryDto, { active: 1 }).active).toBe(
        1,
      );
    });

    it('deve mapear isPassed "true" / "false" e repassar outros valores', () => {
      expect(
        plainToInstance(QuizSubmissionQueryDto, { isPassed: 'true' })
          .isPassed,
      ).toBe(true);
      expect(
        plainToInstance(QuizSubmissionQueryDto, { isPassed: 'false' })
          .isPassed,
      ).toBe(false);
      expect(
        plainToInstance(QuizSubmissionQueryDto, { isPassed: false }).isPassed,
      ).toBe(false);
      expect(
        plainToInstance(QuizSubmissionQueryDto, { isPassed: 'maybe' }).isPassed,
      ).toBe('maybe');
    });
  });

  describe('validate', () => {
    it('deve aceitar payload completo com datas ISO', async () => {
      const instance = plainToInstance(QuizSubmissionQueryDto, {
        page: '1',
        pageSize: '20',
        participationId: '1',
        formVersionId: '2',
        formId: '3',
        active: 'true',
        isPassed: 'false',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
        contextId: '5',
      });
      const errors = await validate(instance);
      expect(errors.length).toBe(0);
    });

    it('deve aceitar objeto vazio (apenas opcionais)', async () => {
      const errors = await validate(
        plainToInstance(QuizSubmissionQueryDto, {}),
      );
      expect(errors.length).toBe(0);
    });
  });
});
