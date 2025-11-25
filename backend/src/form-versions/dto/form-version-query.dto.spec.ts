import { plainToInstance } from 'class-transformer';
import { FormVersionQueryDto } from './form-version-query.dto';

describe('FormVersionQueryDto', () => {
  describe('transform', () => {
    it('deve transformar string "true" para boolean true', () => {
      const plain = { active: 'true' };
      const instance = plainToInstance(FormVersionQueryDto, plain);

      expect(instance.active).toBe(true);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve transformar string "false" para boolean false', () => {
      const plain = { active: 'false' };
      const instance = plainToInstance(FormVersionQueryDto, plain);

      expect(instance.active).toBe(false);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve manter boolean quando já é boolean', () => {
      const plain = { active: true };
      const instance = plainToInstance(FormVersionQueryDto, plain);

      expect(instance.active).toBe(true);
    });
  });
});

