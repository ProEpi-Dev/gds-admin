import { plainToInstance } from 'class-transformer';
import { LocationQueryDto } from './location-query.dto';

describe('LocationQueryDto', () => {
  describe('transform', () => {
    it('deve transformar string "true" para boolean true', () => {
      const plain = { active: 'true' };
      const instance = plainToInstance(LocationQueryDto, plain);

      expect(instance.active).toBe(true);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve transformar string "false" para boolean false', () => {
      const plain = { active: 'false' };
      const instance = plainToInstance(LocationQueryDto, plain);

      expect(instance.active).toBe(false);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve transformar string para number em parentId', () => {
      const plain = { parentId: '1' };
      const instance = plainToInstance(LocationQueryDto, plain);

      expect(instance.parentId).toBe(1);
      expect(typeof instance.parentId).toBe('number');
    });

    it('deve manter valores quando já são do tipo correto', () => {
      const plain = { active: true, parentId: 2 };
      const instance = plainToInstance(LocationQueryDto, plain);

      expect(instance.active).toBe(true);
      expect(instance.parentId).toBe(2);
    });
  });
});

