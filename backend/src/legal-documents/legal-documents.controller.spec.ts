import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  LegalDocumentsController,
  LegalDocumentsAdminController,
} from './legal-documents.controller';
import { LegalDocumentsService } from './legal-documents.service';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { UpdateLegalDocumentDto } from './dto/update-legal-document.dto';
import { CreateLegalDocumentTypeDto } from './dto/create-legal-document-type.dto';
import { UpdateLegalDocumentTypeDto } from './dto/update-legal-document-type.dto';
import { LegalDocumentResponseDto } from './dto/legal-document-response.dto';
import { LegalDocumentTypeResponseDto } from './dto/legal-document-type-response.dto';

describe('LegalDocumentsController', () => {
  let publicController: LegalDocumentsController;
  let adminController: LegalDocumentsAdminController;
  let service: LegalDocumentsService;

  const mockLegalDocument: LegalDocumentResponseDto = {
    id: 1,
    typeId: 1,
    typeCode: 'TERMS_OF_USE',
    typeName: 'Termos de Uso',
    isRequired: true,
    version: '1.0',
    title: 'Termos de Uso',
    content: 'Conteúdo dos termos',
    effectiveDate: '2026-01-01',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLegalDocumentType: LegalDocumentTypeResponseDto = {
    id: 1,
    code: 'TERMS_OF_USE',
    name: 'Termos de Uso',
    description: 'Termos e condições de uso',
    isRequired: true,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalDocumentsController, LegalDocumentsAdminController],
      providers: [
        {
          provide: LegalDocumentsService,
          useValue: {
            findActive: jest.fn(),
            findOne: jest.fn(),
            findByTypeCode: jest.fn(),
            findAllTypes: jest.fn(),
            findAllDocuments: jest.fn(),
            createDocument: jest.fn(),
            updateDocument: jest.fn(),
            deleteDocument: jest.fn(),
            findAllTypesAdmin: jest.fn(),
            findOneType: jest.fn(),
            createDocumentType: jest.fn(),
            updateDocumentType: jest.fn(),
            deleteDocumentType: jest.fn(),
          },
        },
      ],
    }).compile();

    publicController = module.get<LegalDocumentsController>(
      LegalDocumentsController,
    );
    adminController = module.get<LegalDocumentsAdminController>(
      LegalDocumentsAdminController,
    );
    service = module.get<LegalDocumentsService>(LegalDocumentsService);
  });

  it('should be defined', () => {
    expect(publicController).toBeDefined();
    expect(adminController).toBeDefined();
  });

  describe('Public Controller', () => {
    describe('findActive', () => {
      it('deve retornar documentos legais ativos', async () => {
        jest
          .spyOn(service, 'findActive')
          .mockResolvedValue([mockLegalDocument]);

        const result = await publicController.findActive();

        expect(result).toEqual([mockLegalDocument]);
        expect(service.findActive).toHaveBeenCalled();
      });
    });

    describe('findOne', () => {
      it('deve retornar um documento legal específico', async () => {
        jest.spyOn(service, 'findOne').mockResolvedValue(mockLegalDocument);

        const result = await publicController.findOne(1);

        expect(result).toEqual(mockLegalDocument);
        expect(service.findOne).toHaveBeenCalledWith(1);
      });

      it('deve lançar NotFoundException quando documento não existe', async () => {
        jest
          .spyOn(service, 'findOne')
          .mockRejectedValue(new NotFoundException('Documento não encontrado'));

        await expect(publicController.findOne(999)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('findByTypeCode', () => {
      it('deve retornar documento por tipo', async () => {
        jest
          .spyOn(service, 'findByTypeCode')
          .mockResolvedValue(mockLegalDocument);

        const result = await publicController.findByTypeCode('TERMS_OF_USE');

        expect(result).toEqual(mockLegalDocument);
        expect(service.findByTypeCode).toHaveBeenCalledWith('TERMS_OF_USE');
      });
    });

    describe('findAllTypes', () => {
      it('deve retornar todos os tipos de documentos legais', async () => {
        jest
          .spyOn(service, 'findAllTypes')
          .mockResolvedValue([mockLegalDocumentType]);

        const result = await publicController.findAllTypes();

        expect(result).toEqual([mockLegalDocumentType]);
        expect(service.findAllTypes).toHaveBeenCalled();
      });
    });
  });

  describe('Admin - Document Management', () => {
    describe('findAllDocuments', () => {
      it('deve retornar todos os documentos', async () => {
        jest
          .spyOn(service, 'findAllDocuments')
          .mockResolvedValue([mockLegalDocument]);

        const result = await adminController.findAllDocuments();

        expect(result).toEqual([mockLegalDocument]);
        expect(service.findAllDocuments).toHaveBeenCalled();
      });
    });

    describe('findOneDocument', () => {
      it('deve retornar um documento específico', async () => {
        jest.spyOn(service, 'findOne').mockResolvedValue(mockLegalDocument);

        const result = await adminController.findOneDocument(1);

        expect(result).toEqual(mockLegalDocument);
        expect(service.findOne).toHaveBeenCalledWith(1);
      });
    });

    describe('createDocument', () => {
      it('deve criar um novo documento', async () => {
        const createDto: CreateLegalDocumentDto = {
          typeId: 1,
          version: '1.0',
          title: 'Termos de Uso',
          content: 'Conteúdo dos termos',
          effectiveDate: '2026-01-01',
          active: true,
        };

        jest
          .spyOn(service, 'createDocument')
          .mockResolvedValue(mockLegalDocument);

        const result = await adminController.createDocument(createDto);

        expect(result).toEqual(mockLegalDocument);
        expect(service.createDocument).toHaveBeenCalledWith(createDto);
      });
    });

    describe('updateDocument', () => {
      it('deve atualizar um documento', async () => {
        const updateDto: UpdateLegalDocumentDto = {
          title: 'Termos de Uso Atualizados',
        };

        const updatedDoc = {
          ...mockLegalDocument,
          title: 'Termos de Uso Atualizados',
        };
        jest.spyOn(service, 'updateDocument').mockResolvedValue(updatedDoc);

        const result = await adminController.updateDocument(1, updateDto);

        expect(result).toEqual(updatedDoc);
        expect(service.updateDocument).toHaveBeenCalledWith(1, updateDto);
      });
    });

    describe('deleteDocument', () => {
      it('deve deletar um documento', async () => {
        jest.spyOn(service, 'deleteDocument').mockResolvedValue(undefined);

        await adminController.deleteDocument(1);

        expect(service.deleteDocument).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Admin - Document Type Management', () => {
    describe('findAllTypesAdmin', () => {
      it('deve retornar todos os tipos de documentos', async () => {
        jest
          .spyOn(service, 'findAllTypesAdmin')
          .mockResolvedValue([mockLegalDocumentType]);

        const result = await adminController.findAllTypesAdmin();

        expect(result).toEqual([mockLegalDocumentType]);
        expect(service.findAllTypesAdmin).toHaveBeenCalled();
      });
    });

    describe('findOneType', () => {
      it('deve retornar um tipo de documento específico', async () => {
        jest
          .spyOn(service, 'findOneType')
          .mockResolvedValue(mockLegalDocumentType);

        const result = await adminController.findOneType(1);

        expect(result).toEqual(mockLegalDocumentType);
        expect(service.findOneType).toHaveBeenCalledWith(1);
      });
    });

    describe('createDocumentType', () => {
      it('deve criar um novo tipo de documento', async () => {
        const createDto: CreateLegalDocumentTypeDto = {
          code: 'TERMS_OF_USE',
          name: 'Termos de Uso',
          description: 'Termos e condições de uso',
          isRequired: true,
          active: true,
        };

        jest
          .spyOn(service, 'createDocumentType')
          .mockResolvedValue(mockLegalDocumentType);

        const result = await adminController.createDocumentType(createDto);

        expect(result).toEqual(mockLegalDocumentType);
        expect(service.createDocumentType).toHaveBeenCalledWith(createDto);
      });
    });

    describe('updateDocumentType', () => {
      it('deve atualizar um tipo de documento', async () => {
        const updateDto: UpdateLegalDocumentTypeDto = {
          name: 'Termos de Uso Atualizados',
        };

        const updatedType = {
          ...mockLegalDocumentType,
          name: 'Termos de Uso Atualizados',
        };
        jest
          .spyOn(service, 'updateDocumentType')
          .mockResolvedValue(updatedType);

        const result = await adminController.updateDocumentType(1, updateDto);

        expect(result).toEqual(updatedType);
        expect(service.updateDocumentType).toHaveBeenCalledWith(1, updateDto);
      });
    });

    describe('deleteDocumentType', () => {
      it('deve deletar um tipo de documento', async () => {
        jest.spyOn(service, 'deleteDocumentType').mockResolvedValue(undefined);

        await adminController.deleteDocumentType(1);

        expect(service.deleteDocumentType).toHaveBeenCalledWith(1);
      });
    });
  });
});
