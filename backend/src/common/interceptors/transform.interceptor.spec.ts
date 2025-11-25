import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
    mockExecutionContext = {} as ExecutionContext;
    mockCallHandler = {
      handle: jest.fn(),
    } as any;
  });

  describe('intercept', () => {
    it('deve retornar dados como estão quando já formatados', (done) => {
      const formattedData = {
        data: [{ id: 1, name: 'Test' }],
        meta: { page: 1, pageSize: 20 },
        links: { first: '/test?page=1' },
      };

      mockCallHandler.handle = jest.fn().mockReturnValue(of(formattedData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toBe(formattedData);
        done();
      });
    });

    it('deve retornar dados diretamente quando não formatados', (done) => {
      const simpleData = { id: 1, name: 'Test' };

      mockCallHandler.handle = jest.fn().mockReturnValue(of(simpleData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
        expect(result).toBe(simpleData);
        done();
      });
    });
  });
});

