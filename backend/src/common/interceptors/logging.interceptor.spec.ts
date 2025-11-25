import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

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
          expect(loggerSpy).toHaveBeenCalled();
          const logCall = loggerSpy.mock.calls[0][0];
          expect(logCall).toContain('GET');
          expect(logCall).toContain('/test');
          expect(logCall).toContain('200');
          done();
        },
      });
    });

    it('deve logar requisição com erro', (done) => {
      const error = { status: 500, message: 'Internal Server Error' };
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(Logger.prototype.error).toHaveBeenCalled();
          done();
        },
      });
    });

    it('deve calcular delay corretamente', (done) => {
      jest.useFakeTimers();
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ data: 'test' }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          jest.advanceTimersByTime(100);
          expect(loggerSpy).toHaveBeenCalled();
          const logCall = loggerSpy.mock.calls[0][0];
          expect(logCall).toMatch(/\d+ms/);
          jest.useRealTimers();
          done();
        },
      });
    });
  });
});

