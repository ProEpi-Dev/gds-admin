import { plainToInstance } from 'class-transformer';
import { ParticipationQueryDto } from './participation-query.dto';

describe('ParticipationQueryDto', () => {
  describe('transform', () => {
    it('deve transformar string "true" para boolean true', () => {
      const plain = { active: 'true' };
      const instance = plainToInstance(ParticipationQueryDto, plain);

      expect(instance.active).toBe(true);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve transformar string "false" para boolean false', () => {
      const plain = { active: 'false' };
      const instance = plainToInstance(ParticipationQueryDto, plain);

      expect(instance.active).toBe(false);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve transformar string para number em userId', () => {
      const plain = { userId: '1' };
      const instance = plainToInstance(ParticipationQueryDto, plain);

      expect(instance.userId).toBe(1);
      expect(typeof instance.userId).toBe('number');
    });

    it('deve transformar string para number em contextId', () => {
      const plain = { contextId: '2' };
      const instance = plainToInstance(ParticipationQueryDto, plain);

      expect(instance.contextId).toBe(2);
      expect(typeof instance.contextId).toBe('number');
    });
  });
});
