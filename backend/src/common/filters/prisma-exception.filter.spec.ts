import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { PrismaExceptionFilter } from './prisma-exception.filter';
import { Prisma } from '@prisma/client';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaExceptionFilter],
    }).compile();

    filter = module.get<PrismaExceptionFilter>(PrismaExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test-endpoint',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('P2002 - Unique constraint violation', () => {
    it('deve retornar 409 com RFC 9457 format', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: {
            target: ['email'],
          },
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        type: '/errors/unique-constraint',
        title: 'Unique Constraint Violation',
        status: HttpStatus.CONFLICT,
        detail: 'A record with this email already exists',
        instance: '/test-endpoint',
        field: 'email',
      });
    });

    it('deve retornar mensagem genérica quando field não está disponível', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: {},
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'A record with these values already exists',
        }),
      );
    });

    it('não deve incluir field quando não está disponível', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: {},
        },
      );

      filter.catch(exception, mockArgumentsHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('field');
    });
  });

  describe('P2025 - Record not found', () => {
    it('deve retornar 404 com RFC 9457 format', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found',
        {
          code: 'P2025',
          clientVersion: '4.0.0',
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        type: '/errors/not-found',
        title: 'Record Not Found',
        status: HttpStatus.NOT_FOUND,
        detail: 'The requested record was not found',
        instance: '/test-endpoint',
      });
    });
  });

  describe('P2003 - Foreign key constraint', () => {
    it('deve retornar 400 com RFC 9457 format', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '4.0.0',
          meta: {
            field_name: 'user_id',
          },
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        type: '/errors/foreign-key',
        title: 'Foreign Key Constraint Violation',
        status: HttpStatus.BAD_REQUEST,
        detail: 'The referenced record does not exist',
        instance: '/test-endpoint',
        field: 'user_id',
      });
    });
  });

  describe('P2014 - Required relation violation', () => {
    it('deve retornar 400 com RFC 9457 format', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Required relation violation',
        {
          code: 'P2014',
          clientVersion: '4.0.0',
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        type: '/errors/required-relation',
        title: 'Required Relation Violation',
        status: HttpStatus.BAD_REQUEST,
        detail: 'The change would violate a required relation',
        instance: '/test-endpoint',
      });
    });
  });

  describe('Unknown Prisma error', () => {
    it('deve retornar 500 com RFC 9457 format', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unknown error',
        {
          code: 'P9999',
          clientVersion: '4.0.0',
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        type: '/errors/database',
        title: 'Database Error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: 'An unexpected database error occurred',
        instance: '/test-endpoint',
      });
    });
  });

  describe('RFC 9457 compliance', () => {
    it('deve sempre incluir campos obrigatórios do RFC 9457', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: {
            target: ['slug'],
          },
        },
      );

      filter.catch(exception, mockArgumentsHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs).toHaveProperty('type');
      expect(callArgs).toHaveProperty('title');
      expect(callArgs).toHaveProperty('status');
      expect(callArgs).toHaveProperty('detail');
      expect(callArgs).toHaveProperty('instance');
    });

    it('deve usar URL da requisição como instance', () => {
      mockRequest.url = '/api/v1/users/123';

      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          instance: '/api/v1/users/123',
        }),
      );
    });
  });
});
