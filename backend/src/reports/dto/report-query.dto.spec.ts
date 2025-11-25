import { plainToInstance } from 'class-transformer';
import { ReportQueryDto } from './report-query.dto';

describe('ReportQueryDto', () => {
  describe('transform', () => {
    it('deve transformar string "true" para boolean true', () => {
      const plain = { active: 'true' };
      const instance = plainToInstance(ReportQueryDto, plain);

      expect(instance.active).toBe(true);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve transformar string "false" para boolean false', () => {
      const plain = { active: 'false' };
      const instance = plainToInstance(ReportQueryDto, plain);

      expect(instance.active).toBe(false);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve transformar string para number em participationId', () => {
      const plain = { participationId: '1' };
      const instance = plainToInstance(ReportQueryDto, plain);

      expect(instance.participationId).toBe(1);
      expect(typeof instance.participationId).toBe('number');
    });

    it('deve transformar string para number em formVersionId', () => {
      const plain = { formVersionId: '2' };
      const instance = plainToInstance(ReportQueryDto, plain);

      expect(instance.formVersionId).toBe(2);
      expect(typeof instance.formVersionId).toBe('number');
    });

    it('deve manter reportType como enum', () => {
      const plain = { reportType: 'POSITIVE' };
      const instance = plainToInstance(ReportQueryDto, plain);

      expect(instance.reportType).toBe('POSITIVE');
    });
  });
});

