import { Test, TestingModule } from '@nestjs/testing';
import { LegalDocumentsService } from './legal-documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('LegalDocumentsService', () => {
  let service: LegalDocumentsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    legal_document_type: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    legal_document: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalDocumentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LegalDocumentsService>(LegalDocumentsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findActive', () => {
    it('deve retornar documentos ativos', async () => {
      const mockType = {
        id: 1,
        code: 'TERMS_OF_USE',
        name: 'Termos de Uso',
        is_required: true,
        active: true,
      };

      const mockDocument = {
        id: 1,
        type_id: 1,
        version: '1.0',
        title: 'Termos de Uso',
        content: 'Conteúdo...',
        effective_date: new Date('2026-01-01'),
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        legal_document_type: mockType,
      };

      mockPrismaService.legal_document_type.findMany.mockResolvedValue([
        mockType,
      ]);
      mockPrismaService.legal_document.findFirst.mockResolvedValue(
        mockDocument,
      );

      const result = await service.findActive();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].typeCode).toBe('TERMS_OF_USE');
      expect(result[0].typeName).toBe('Termos de Uso');
      expect(result[0].isRequired).toBe(true);
    });

    it('deve retornar array vazio quando não há documentos ativos', async () => {
      mockPrismaService.legal_document_type.findMany.mockResolvedValue([]);

      const result = await service.findActive();

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('deve retornar documento por id', async () => {
      const mockType = {
        id: 1,
        code: 'TERMS_OF_USE',
        name: 'Termos de Uso',
        is_required: true,
      };

      const mockDocument = {
        id: 1,
        type_id: 1,
        version: '1.0',
        title: 'Termos de Uso',
        content: 'Conteúdo...',
        effective_date: new Date('2026-01-01'),
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        legal_document_type: mockType,
      };

      mockPrismaService.legal_document.findUnique.mockResolvedValue(
        mockDocument,
      );

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.title).toBe('Termos de Uso');
      expect(result.typeCode).toBe('TERMS_OF_USE');
    });

    it('deve lançar NotFoundException quando documento não encontrado', async () => {
      mockPrismaService.legal_document.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByTypeCode', () => {
    it('deve retornar documento por código do tipo', async () => {
      const mockType = {
        id: 1,
        code: 'TERMS_OF_USE',
        name: 'Termos de Uso',
        is_required: true,
      };

      const mockDocument = {
        id: 1,
        type_id: 1,
        version: '1.0',
        title: 'Termos de Uso',
        content: 'Conteúdo...',
        effective_date: new Date('2026-01-01'),
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        legal_document_type: mockType,
      };

      mockPrismaService.legal_document_type.findUnique.mockResolvedValue(mockType);
      mockPrismaService.legal_document.findFirst.mockResolvedValue(mockDocument);

      const result = await service.findByTypeCode('TERMS_OF_USE');

      expect(result.typeCode).toBe('TERMS_OF_USE');
      expect(result.version).toBe('1.0');
    });

    it('deve lançar NotFoundException quando tipo não existe', async () => {
      mockPrismaService.legal_document_type.findUnique.mockResolvedValue(null);

      await expect(service.findByTypeCode('INVALID_TYPE')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateDocumentIds', () => {
    it('deve validar todos IDs de documentos com sucesso', async () => {
      mockPrismaService.legal_document.findMany.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);

      const result = await service.validateDocumentIds([1, 2]);

      expect(result).toBe(true);
      expect(mockPrismaService.legal_document.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: [1, 2] },
          active: true,
        },
      });
    });

    it('deve lançar BadRequestException para IDs inválidos', async () => {
      mockPrismaService.legal_document.findMany.mockResolvedValue([{ id: 1 }]);

      await expect(service.validateDocumentIds([1, 2])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findRequiredDocuments', () => {
    it('deve retornar apenas documentos obrigatórios ativos', async () => {
      const mockRequiredType = {
        id: 1,
        code: 'TERMS_OF_USE',
        name: 'Termos de Uso',
        is_required: true,
        active: true,
      };

      const mockDocument = {
        id: 1,
        type_id: 1,
        version: '1.0',
        title: 'Termos de Uso',
        content: 'Conteúdo...',
        effective_date: new Date('2026-01-01'),
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        legal_document_type: mockRequiredType,
      };

      mockPrismaService.legal_document_type.findMany.mockResolvedValue([mockRequiredType]);
      mockPrismaService.legal_document.findFirst.mockResolvedValue(mockDocument);

      const result = await service.findRequiredDocuments();

      expect(result).toHaveLength(1);
      expect(result[0].isRequired).toBe(true);
    });
  });
});
