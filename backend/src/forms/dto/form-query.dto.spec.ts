import { plainToInstance } from 'class-transformer';
import { FormQueryDto } from './form-query.dto';

describe('FormQueryDto', () => {
  describe('transform', () => {
    it('deve transformar string "true" para boolean true', () => {
      const plain = { active: 'true' };
      const instance = plainToInstance(FormQueryDto, plain);

      expect(instance.active).toBe(true);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve transformar string "false" para boolean false', () => {
      const plain = { active: 'false' };
      const instance = plainToInstance(FormQueryDto, plain);

      expect(instance.active).toBe(false);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve manter type como enum', () => {
      const plain = { type: 'signal' };
      const instance = plainToInstance(FormQueryDto, plain);

      expect(instance.type).toBe('signal');
    });

    it('deve manter reference como string', () => {
      const plain = { reference: 'FORM-001' };
      const instance = plainToInstance(FormQueryDto, plain);

      expect(instance.reference).toBe('FORM-001');
      expect(typeof instance.reference).toBe('string');
    });
  });
});
