import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ReportsPointsQueryDto,
  REPORTS_POINTS_MAX_LIMIT,
} from './reports-points-query.dto';

describe('ReportsPointsQueryDto', () => {
  const base = {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
  };

  describe('transform (@Type number)', () => {
    it('converte contextId, formId e limit de string para number', () => {
      const instance = plainToInstance(ReportsPointsQueryDto, {
        ...base,
        contextId: '7',
        formId: '3',
        limit: '5000',
      });
      expect(instance.contextId).toBe(7);
      expect(instance.formId).toBe(3);
      expect(instance.limit).toBe(5000);
    });
  });

  describe('validate', () => {
    it('aceita payload mínimo válido', async () => {
      const instance = plainToInstance(ReportsPointsQueryDto, base);
      expect(await validate(instance)).toHaveLength(0);
    });

    it('aceita formReference opcional', async () => {
      const instance = plainToInstance(ReportsPointsQueryDto, {
        ...base,
        formReference: 'FORM-001',
      });
      expect(await validate(instance)).toHaveLength(0);
    });

    it('rejeita limit acima do teto', async () => {
      const instance = plainToInstance(ReportsPointsQueryDto, {
        ...base,
        limit: REPORTS_POINTS_MAX_LIMIT + 1,
      });
      const errors = await validate(instance);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejeita limit menor que 1', async () => {
      const instance = plainToInstance(ReportsPointsQueryDto, {
        ...base,
        limit: 0,
      });
      const errors = await validate(instance);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
