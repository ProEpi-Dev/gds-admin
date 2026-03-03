import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { PinoLogger } from 'nestjs-pino';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockLogger: jest.Mocked<PinoLogger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
    } as any;

    interceptor = new LoggingInterceptor(mockLogger);

    const mockRequest = {
      method: 'GET',
      url: '/test',
    };

    const mockResponse = {
      statusCode: 200,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as any;

    mockCallHandler = {
      handle: jest.fn(),
    } as any;
  });

  describe('intercept', () => {
    it('deve logar requisição bem-sucedida', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ data: 'test' }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(mockLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'GET', url: '/test', statusCode: 200 }),
            'GET /test',
          );
          done();
        },
      });
    });

    it('deve logar requisição com erro', (done) => {
      const error = { status: 500, message: 'Internal Server Error' };
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'GET', url: '/test', statusCode: 500 }),
            'GET /test',
          );
          done();
        },
      });
    });

    it('deve calcular delay corretamente', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ data: 'test' }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const call = (mockLogger.info as jest.Mock).mock.calls[0][0];
          expect(call).toHaveProperty('ms');
          expect(typeof call.ms).toBe('number');
          done();
        },
      });
    });
  });
});
