import { plainToInstance } from 'class-transformer';
import { ContextQueryDto } from './context-query.dto';

describe('ContextQueryDto', () => {
  describe('transform', () => {
    it('deve transformar string "true" para boolean true', () => {
      const plain = { active: 'true' };
      const instance = plainToInstance(ContextQueryDto, plain);

      expect(instance.active).toBe(true);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve transformar string "false" para boolean false', () => {
      const plain = { active: 'false' };
      const instance = plainToInstance(ContextQueryDto, plain);

      expect(instance.active).toBe(false);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve transformar string para number em locationId', () => {
      const plain = { locationId: '1' };
      const instance = plainToInstance(ContextQueryDto, plain);

      expect(instance.locationId).toBe(1);
      expect(typeof instance.locationId).toBe('number');
    });

    it('deve manter accessType como enum', () => {
      const plain = { accessType: 'PUBLIC' };
      const instance = plainToInstance(ContextQueryDto, plain);

      expect(instance.accessType).toBe('PUBLIC');
    });
  });
});
