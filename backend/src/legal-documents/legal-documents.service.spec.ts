import { Test, TestingModule } from '@nestjs/testing';
import { LegalDocumentsService } from './legal-documents.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { LegalDocumentResponseDto } from './dto/legal-document-response.dto';

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
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user_legal_acceptance: {
      count: jest.fn(),
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
    it('findByTypeCode – lança NotFoundException quando documento não existe', async () => {
      mockPrismaService.legal_document_type.findUnique.mockResolvedValue({
        id: 1,
        code: 'TERMS',
      });

      mockPrismaService.legal_document.findFirst.mockResolvedValue(null);

      await expect(service.findByTypeCode('TERMS')).rejects.toThrow(
        NotFoundException,
      );
    });

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

      mockPrismaService.legal_document_type.findUnique.mockResolvedValue(
        mockType,
      );
      mockPrismaService.legal_document.findFirst.mockResolvedValue(
        mockDocument,
      );

      const result = await service.findByTypeCode('TERMS_OF_USE');

      expect(result.typeCode).toBe('TERMS_OF_USE');
      expect(result.version).toBe('1.0');
    });

    it('deve lançar NotFoundException quando tipo não existe', async () => {
      mockPrismaService.legal_document_type.findUnique.mockResolvedValue(null);

      await expect(service.findByTypeCode('INVALID_TYPE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateDocumentIds', () => {
    it('validateDocumentIds – retorna true para array vazio', async () => {
      mockPrismaService.legal_document.findMany.mockResolvedValue([]);

      const result = await service.validateDocumentIds([]);
      expect(result).toBe(true);
    });

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

  describe('createDocument', () => {
    it('deve criar documento legal com sucesso', async () => {
      const dto = {
        typeId: 1,
        version: '1.0',
        title: 'Título',
        content: 'Conteúdo',
        effectiveDate: '2026-01-01',
        active: true,
      };

      const mockType = {
        id: 1,
        name: 'Termos',
        code: 'TERMS',
        is_required: true,
      };

      mockPrismaService.legal_document_type.findUnique.mockResolvedValue(
        mockType,
      );
      mockPrismaService.legal_document.findFirst.mockResolvedValue(null);
      mockPrismaService.legal_document.create.mockResolvedValue({
        id: 1,
        type_id: 1,
        version: '1.0',
        title: 'Título',
        content: 'Conteúdo',
        effective_date: new Date('2026-01-01'),
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        legal_document_type: mockType,
      });

      const result = await service.createDocument(dto);

      expect(result.id).toBe(1);
      expect(result.typeCode).toBe('TERMS');
    });

    it('deve lançar NotFoundException se tipo não existir', async () => {
      mockPrismaService.legal_document_type.findUnique.mockResolvedValue(null);

      await expect(
        service.createDocument({
          typeId: 999,
          version: '1.0',
          title: 'Titulo',
          content: 'Conteudo',
          effectiveDate: '2026-01-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ConflictException se versão já existir para o tipo', async () => {
      const mockType = { id: 1, name: 'Termos', code: 'TERMS' };
      mockPrismaService.legal_document_type.findUnique.mockResolvedValue(
        mockType,
      );
      mockPrismaService.legal_document.findFirst.mockResolvedValue({ id: 2 });

      await expect(
        service.createDocument({
          typeId: 1,
          version: '1.0',
          title: 'Titulo',
          content: 'Conteudo',
          effectiveDate: '2026-01-01',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateDocument', () => {
    it('deve atualizar documento com sucesso', async () => {
      const dto = { version: '2.0' };
      const existingDoc = { id: 1, type_id: 1, version: '1.0' };
      const updatedDoc = {
        id: 1,
        type_id: 1,
        version: '2.0',
        title: 'Título',
        content: 'Conteúdo',
        effective_date: new Date('2026-01-01'),
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        legal_document_type: {
          id: 1,
          code: 'TERMS',
          name: 'Termos',
          is_required: true,
        },
      };

      mockPrismaService.legal_document.findUnique.mockResolvedValue(
        existingDoc,
      );
      mockPrismaService.legal_document.findFirst.mockResolvedValue(null);
      mockPrismaService.legal_document.update.mockResolvedValue(updatedDoc);

      const result = await service.updateDocument(1, dto);

      expect(result.version).toBe('2.0');
    });

    it('deve lançar NotFoundException se documento não existir', async () => {
      mockPrismaService.legal_document.findUnique.mockResolvedValue(null);

      await expect(service.updateDocument(999, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ConflictException se versão conflitar', async () => {
      const existingDoc = { id: 1, type_id: 1, version: '1.0' };
      const conflictingDoc = { id: 2 };

      mockPrismaService.legal_document.findUnique.mockResolvedValue(
        existingDoc,
      );
      mockPrismaService.legal_document.findFirst.mockResolvedValue(
        conflictingDoc,
      );

      await expect(
        service.updateDocument(1, { version: '1.0' }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve lançar NotFoundException se tipo atualizado não existir', async () => {
      const existingDoc = { id: 1, type_id: 1, version: '1.0' };

      mockPrismaService.legal_document.findUnique.mockResolvedValue(
        existingDoc,
      );
      mockPrismaService.legal_document_type.findUnique.mockResolvedValue(null);

      await expect(service.updateDocument(1, { typeId: 999 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateRequiredDocuments', () => {
    it('deve passar quando todos documentos obrigatórios estão incluídos', async () => {
      const requiredDocs: LegalDocumentResponseDto[] = [
        {
          id: 1,
          typeId: 1,
          typeCode: 'TERMS_OF_USE',
          typeName: 'Termos de Uso',
          isRequired: true,
          version: '1.0',
          title: 'Termos de Uso',
          content: 'Conteúdo do termo',
          effectiveDate: '2026-01-01',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          typeId: 2,
          typeCode: 'PRIVACY_POLICY',
          typeName: 'Política de Privacidade',
          isRequired: true,
          version: '1.0',
          title: 'Política de Privacidade',
          content: 'Conteúdo da política',
          effectiveDate: '2026-01-01',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest
        .spyOn(service, 'findRequiredDocuments')
        .mockResolvedValue(requiredDocs);

      await expect(
        service.validateRequiredDocuments([1, 2, 3]),
      ).resolves.toBeUndefined();
    });

    it('deve lançar BadRequestException quando faltar algum documento obrigatório', async () => {
      const requiredDocs: LegalDocumentResponseDto[] = [
        {
          id: 1,
          typeId: 1,
          typeCode: 'TERMS_OF_USE',
          typeName: 'Termos de Uso',
          isRequired: true,
          version: '1.0',
          title: 'Termos de Uso',
          content: 'Conteúdo do termo',
          effectiveDate: '2026-01-01',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          typeId: 2,
          typeCode: 'PRIVACY_POLICY',
          typeName: 'Política de Privacidade',
          isRequired: true,
          version: '1.0',
          title: 'Política de Privacidade',
          content: 'Conteúdo da política',
          effectiveDate: '2026-01-01',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest
        .spyOn(service, 'findRequiredDocuments')
        .mockResolvedValue(requiredDocs);

      await expect(service.validateRequiredDocuments([1])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteDocument', () => {
    it('deve deletar documento com sucesso', async () => {
      const doc = { id: 1 };

      mockPrismaService.legal_document.findUnique.mockResolvedValue(doc);
      mockPrismaService.user_legal_acceptance.count.mockResolvedValue(0);
      mockPrismaService.legal_document.delete.mockResolvedValue({});

      await expect(service.deleteDocument(1)).resolves.toBeUndefined();
    });

    it('deve lançar NotFoundException se documento não existir', async () => {
      mockPrismaService.legal_document.findUnique.mockResolvedValue(null);

      await expect(service.deleteDocument(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException se houver aceitações vinculadas', async () => {
      mockPrismaService.legal_document.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.user_legal_acceptance.count.mockResolvedValue(5);

      await expect(service.deleteDocument(1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findRequiredDocuments', () => {
    it('findRequiredDocuments – retorna vazio quando não há documento ativo', async () => {
      mockPrismaService.legal_document_type.findMany.mockResolvedValue([
        {
          id: 1,
          code: 'TERMS',
          is_required: true,
          active: true,
        },
      ]);

      mockPrismaService.legal_document.findFirst.mockResolvedValue(null);

      const result = await service.findRequiredDocuments();
      expect(result).toEqual([]);
    });

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

      mockPrismaService.legal_document_type.findMany.mockResolvedValue([
        mockRequiredType,
      ]);
      mockPrismaService.legal_document.findFirst.mockResolvedValue(
        mockDocument,
      );

      const result = await service.findRequiredDocuments();

      expect(result).toHaveLength(1);
      expect(result[0].isRequired).toBe(true);
    });
  });
});
