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

    it('mantém active quando não é string true/false', () => {
      const instance = plainToInstance(ParticipationQueryDto, {
        active: 1 as unknown as boolean,
      });
      expect(instance.active).toBe(1);
    });

    it('transforma includeUser a partir de string ou boolean', () => {
      expect(
        plainToInstance(ParticipationQueryDto, { includeUser: 'true' })
          .includeUser,
      ).toBe(true);
      expect(
        plainToInstance(ParticipationQueryDto, { includeUser: true })
          .includeUser,
      ).toBe(true);
      expect(
        plainToInstance(ParticipationQueryDto, { includeUser: 'false' })
          .includeUser,
      ).toBe(false);
    });
  });
});
