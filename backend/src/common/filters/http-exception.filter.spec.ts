import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as any;
  });

  describe('catch', () => {
    it('deve tratar HttpException corretamente', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Test error',
        },
      });
    });

    it('deve tratar exceção com response string', () => {
      const exception = new HttpException(
        'Error message',
        HttpStatus.NOT_FOUND,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error message',
        },
      });
    });

    it('deve tratar exceção com response object', () => {
      const exception = new HttpException(
        {
          message: 'Custom error',
          code: 'CUSTOM_ERROR',
          details: ['Detail 1', 'Detail 2'],
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Custom error',
          details: ['Detail 1', 'Detail 2'],
        },
      });
    });

    it('deve tratar Error genérico', () => {
      const error = new Error('Generic error');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Generic error',
        },
      });
    });

    it('deve retornar formato de erro padronizado', () => {
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String),
          }),
        }),
      );
    });

    it('deve incluir details quando disponível', () => {
      const exception = new HttpException(
        {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: ['Field is required'],
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: ['Field is required'],
        },
      });
    });
  });
});
