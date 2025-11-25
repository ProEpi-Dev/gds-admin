import { plainToInstance } from 'class-transformer';
import { UserQueryDto } from './user-query.dto';

describe('UserQueryDto', () => {
  describe('transform', () => {
    it('deve transformar string "true" para boolean true', () => {
      const plain = { active: 'true' };
      const instance = plainToInstance(UserQueryDto, plain);

      expect(instance.active).toBe(true);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve transformar string "false" para boolean false', () => {
      const plain = { active: 'false' };
      const instance = plainToInstance(UserQueryDto, plain);

      expect(instance.active).toBe(false);
      expect(typeof instance.active).toBe('boolean');
    });

    it('deve manter boolean quando já é boolean', () => {
      const plain = { active: true };
      const instance = plainToInstance(UserQueryDto, plain);

      expect(instance.active).toBe(true);
    });

    it('deve manter search como string', () => {
      const plain = { search: 'joao' };
      const instance = plainToInstance(UserQueryDto, plain);

      expect(instance.search).toBe('joao');
      expect(typeof instance.search).toBe('string');
    });

    it('deve herdar transformações de PaginationQueryDto', () => {
      const plain = { page: '2', pageSize: '30', active: 'true' };
      const instance = plainToInstance(UserQueryDto, plain);

      expect(instance.page).toBe(2);
      expect(instance.pageSize).toBe(30);
      expect(instance.active).toBe(true);
    });
  });
});

