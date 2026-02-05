import {
  createPaginationMeta,
  createPaginationLinks,
} from './pagination.helper';

describe('PaginationHelper', () => {
  describe('createPaginationMeta', () => {
    it('deve calcular totalPages corretamente', () => {
      const result = createPaginationMeta({
        page: 1,
        pageSize: 20,
        totalItems: 100,
        baseUrl: '/test',
      });

      expect(result.totalPages).toBe(5);
    });

    it('deve arredondar totalPages para cima', () => {
      const result = createPaginationMeta({
        page: 1,
        pageSize: 20,
        totalItems: 101,
        baseUrl: '/test',
      });

      expect(result.totalPages).toBe(6);
    });

    it('deve retornar meta completa', () => {
      const result = createPaginationMeta({
        page: 2,
        pageSize: 10,
        totalItems: 50,
        baseUrl: '/test',
      });

      expect(result).toEqual({
        page: 2,
        pageSize: 10,
        totalPages: 5,
        totalItems: 50,
      });
    });
  });

  describe('createPaginationLinks', () => {
    it('deve criar link first', () => {
      const result = createPaginationLinks({
        page: 3,
        pageSize: 20,
        totalItems: 100,
        baseUrl: '/test',
      });

      expect(result.first).toBe('/test?page=1&pageSize=20');
    });

    it('deve criar link last', () => {
      const result = createPaginationLinks({
        page: 3,
        pageSize: 20,
        totalItems: 100,
        baseUrl: '/test',
      });

      expect(result.last).toBe('/test?page=5&pageSize=20');
    });

    it('deve criar link prev quando não é primeira página', () => {
      const result = createPaginationLinks({
        page: 3,
        pageSize: 20,
        totalItems: 100,
        baseUrl: '/test',
      });

      expect(result.prev).toBe('/test?page=2&pageSize=20');
    });

    it('deve retornar null para prev na primeira página', () => {
      const result = createPaginationLinks({
        page: 1,
        pageSize: 20,
        totalItems: 100,
        baseUrl: '/test',
      });

      expect(result.prev).toBeNull();
    });

    it('deve criar link next quando não é última página', () => {
      const result = createPaginationLinks({
        page: 3,
        pageSize: 20,
        totalItems: 100,
        baseUrl: '/test',
      });

      expect(result.next).toBe('/test?page=4&pageSize=20');
    });

    it('deve retornar null para next na última página', () => {
      const result = createPaginationLinks({
        page: 5,
        pageSize: 20,
        totalItems: 100,
        baseUrl: '/test',
      });

      expect(result.next).toBeNull();
    });

    it('deve incluir queryParams nos links', () => {
      const result = createPaginationLinks({
        page: 2,
        pageSize: 20,
        totalItems: 100,
        baseUrl: '/test',
        queryParams: { active: 'true', search: 'test' },
      });

      expect(result.first).toContain('active=true');
      expect(result.first).toContain('search=test');
      expect(result.first).toContain('page=1');
      expect(result.first).toContain('pageSize=20');
    });
  });
});
