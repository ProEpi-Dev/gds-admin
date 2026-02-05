import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FormVersionsService } from './form-versions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormVersionDto } from './dto/create-form-version.dto';
import { UpdateFormVersionDto } from './dto/update-form-version.dto';
import { FormVersionQueryDto } from './dto/form-version-query.dto';

describe('FormVersionsService', () => {
  let service: FormVersionsService;
  let prismaService: PrismaService;

  const mockFormVersion = {
    id: 1,
    form_id: 1,
    version_number: 1,
    access_type: 'PUBLIC',
    definition: {},
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockForm = {
    id: 1,
    title: 'Test Form',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormVersionsService,
        {
          provide: PrismaService,
          useValue: {
            form: {
              findUnique: jest.fn(),
            },
            form_version: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            report: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FormVersionsService>(FormVersionsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('deve criar versão com número correto', async () => {
      const createDto: CreateFormVersionDto = {
        accessType: 'PUBLIC',
        definition: {},
        active: true,
      };

      jest
        .spyOn(prismaService.form, 'findUnique')
        .mockResolvedValue(mockForm as any);
      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.form_version, 'create')
        .mockResolvedValue(mockFormVersion as any);

      const result = await service.create(1, createDto);

      expect(result).toHaveProperty('versionNumber', 1);
      expect(prismaService.form_version.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          version_number: 1,
        }),
      });
    });

    it('deve calcular próximo número automaticamente', async () => {
      const createDto: CreateFormVersionDto = {
        accessType: 'PUBLIC',
        definition: {},
      };

      const lastVersion = {
        ...mockFormVersion,
        version_number: 2,
      };

      jest
        .spyOn(prismaService.form, 'findUnique')
        .mockResolvedValue(mockForm as any);
      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(lastVersion as any);
      jest.spyOn(prismaService.form_version, 'create').mockResolvedValue({
        ...mockFormVersion,
        version_number: 3,
      } as any);

      await service.create(1, createDto);

      expect(prismaService.form_version.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          version_number: 3,
        }),
      });
    });

    it('deve lançar NotFoundException quando form não existe', async () => {
      const createDto: CreateFormVersionDto = {
        accessType: 'PUBLIC',
        definition: {},
      };

      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(null);

      await expect(service.create(999, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllByForm', () => {
    it('deve retornar lista paginada', async () => {
      const query: FormVersionQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.form, 'findUnique')
        .mockResolvedValue(mockForm as any);
      jest
        .spyOn(prismaService.form_version, 'findMany')
        .mockResolvedValue([mockFormVersion] as any);
      jest.spyOn(prismaService.form_version, 'count').mockResolvedValue(1);

      const result = await service.findAllByForm(1, query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });

    it('deve lançar NotFoundException quando form não existe', async () => {
      const query: FormVersionQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(null);

      await expect(service.findAllByForm(999, query)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar versão quando existe', async () => {
      jest
        .spyOn(prismaService.form, 'findUnique')
        .mockResolvedValue(mockForm as any);
      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(mockFormVersion as any);

      const result = await service.findOne(1, 1);

      expect(result).toHaveProperty('id', 1);
    });

    it('deve lançar NotFoundException quando form não existe', async () => {
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException quando versão não existe', async () => {
      jest
        .spyOn(prismaService.form, 'findUnique')
        .mockResolvedValue(mockForm as any);
      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar versão quando definition não muda', async () => {
      const updateDto: UpdateFormVersionDto = {
        accessType: 'PRIVATE',
      };

      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(mockFormVersion as any);
      jest.spyOn(prismaService.form_version, 'update').mockResolvedValue({
        ...mockFormVersion,
        access_type: 'PRIVATE',
      } as any);

      const result = await service.update(1, 1, updateDto);

      expect(result).toHaveProperty('accessType', 'PRIVATE');
    });

    it('deve atualizar definition quando não muda (mesmo conteúdo)', async () => {
      const updateDto: UpdateFormVersionDto = {
        definition: {},
      };

      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(mockFormVersion as any);
      jest
        .spyOn(prismaService.form_version, 'update')
        .mockResolvedValue(mockFormVersion as any);

      await service.update(1, 1, updateDto);

      expect(prismaService.form_version.update).toHaveBeenCalled();
    });

    it('deve atualizar active quando fornecido', async () => {
      const updateDto: UpdateFormVersionDto = {
        active: false,
      };

      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(mockFormVersion as any);
      jest.spyOn(prismaService.form_version, 'update').mockResolvedValue({
        ...mockFormVersion,
        active: false,
      } as any);

      await service.update(1, 1, updateDto);

      expect(prismaService.form_version.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve criar nova versão quando definition muda', async () => {
      const updateDto: UpdateFormVersionDto = {
        definition: { newField: 'value' },
      };

      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(mockFormVersion as any);
      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValueOnce(mockFormVersion as any)
        .mockResolvedValueOnce({
          ...mockFormVersion,
          version_number: 1,
        } as any);
      jest.spyOn(prismaService.form_version, 'create').mockResolvedValue({
        ...mockFormVersion,
        id: 2,
        version_number: 2,
        definition: { newField: 'value' },
      } as any);

      const result = await service.update(1, 1, updateDto);

      expect(prismaService.form_version.create).toHaveBeenCalled();
      expect(result).toHaveProperty('versionNumber', 2);
    });

    it('deve calcular número da nova versão corretamente', async () => {
      const updateDto: UpdateFormVersionDto = {
        definition: { newField: 'value' },
      };

      const lastVersion = {
        ...mockFormVersion,
        version_number: 3,
      };

      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValueOnce(mockFormVersion as any)
        .mockResolvedValueOnce(lastVersion as any);
      jest.spyOn(prismaService.form_version, 'create').mockResolvedValue({
        ...mockFormVersion,
        version_number: 4,
      } as any);

      await service.update(1, 1, updateDto);

      expect(prismaService.form_version.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          version_number: 4,
        }),
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateDto: UpdateFormVersionDto = {
        accessType: 'PRIVATE',
      };

      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(null);

      await expect(service.update(1, 999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deve desativar versão', async () => {
      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(mockFormVersion as any);
      jest.spyOn(prismaService.report, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.form_version, 'update').mockResolvedValue({
        ...mockFormVersion,
        active: false,
      } as any);

      await service.remove(1, 1);

      expect(prismaService.form_version.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando possui reports', async () => {
      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(mockFormVersion as any);
      jest.spyOn(prismaService.report, 'count').mockResolvedValue(2);

      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('mapToResponseDto', () => {
    it('deve mapear todos os campos corretamente', async () => {
      jest
        .spyOn(prismaService.form, 'findUnique')
        .mockResolvedValue(mockForm as any);
      jest
        .spyOn(prismaService.form_version, 'findFirst')
        .mockResolvedValue(mockFormVersion as any);

      const result = await service.findOne(1, 1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('formId', 1);
      expect(result).toHaveProperty('versionNumber', 1);
      expect(result).toHaveProperty('accessType', 'PUBLIC');
    });
  });
});
