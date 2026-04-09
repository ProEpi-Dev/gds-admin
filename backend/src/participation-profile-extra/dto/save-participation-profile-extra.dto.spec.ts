import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaveParticipationProfileExtraDto } from './save-participation-profile-extra.dto';

describe('SaveParticipationProfileExtraDto', () => {
  describe('transform', () => {
    it('deve transformar formVersionId string em number', () => {
      const instance = plainToInstance(SaveParticipationProfileExtraDto, {
        formVersionId: '99',
        formResponse: { a: 1 },
      });

      expect(instance.formVersionId).toBe(99);
      expect(typeof instance.formVersionId).toBe('number');
      expect(instance.formResponse).toEqual({ a: 1 });
    });
  });

  describe('validate', () => {
    it('aceita payload válido', async () => {
      const dto = plainToInstance(SaveParticipationProfileExtraDto, {
        formVersionId: 1,
        formResponse: { x: 'y' },
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('rejeita formVersionId não inteiro', async () => {
      const dto = Object.assign(new SaveParticipationProfileExtraDto(), {
        formVersionId: 1.5,
        formResponse: {},
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejeita formResponse que não é objeto', async () => {
      const dto = Object.assign(new SaveParticipationProfileExtraDto(), {
        formVersionId: 1,
        formResponse: 'não-objeto' as unknown as Record<string, unknown>,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
