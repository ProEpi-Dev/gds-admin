import { plainToInstance } from 'class-transformer';
import { PaginationQueryDto } from './pagination.dto';

describe('PaginationQueryDto', () => {
  describe('transform', () => {
    it('deve transformar string para number em page', () => {
      const plain = { page: '1', pageSize: '20' };
      const instance = plainToInstance(PaginationQueryDto, plain);

      expect(instance.page).toBe(1);
      expect(typeof instance.page).toBe('number');
    });

    it('deve transformar string para number em pageSize', () => {
      const plain = { page: '1', pageSize: '20' };
      const instance = plainToInstance(PaginationQueryDto, plain);

      expect(instance.pageSize).toBe(20);
      expect(typeof instance.pageSize).toBe('number');
    });

    it('deve usar valores padrão quando não fornecidos', () => {
      const plain = {};
      const instance = plainToInstance(PaginationQueryDto, plain);

      expect(instance.page).toBe(1);
      expect(instance.pageSize).toBe(20);
    });

    it('deve manter valores number quando já são números', () => {
      const plain = { page: 2, pageSize: 30 };
      const instance = plainToInstance(PaginationQueryDto, plain);

      expect(instance.page).toBe(2);
      expect(instance.pageSize).toBe(30);
    });
  });
});
