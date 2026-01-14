import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FormsService } from './forms.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FormQueryDto } from './dto/form-query.dto';
import * as userContextHelper from '../common/helpers/user-context.helper';

jest.mock('../common/helpers/user-context.helper');

describe('FormsService', () => {
  let service: FormsService;
  let prismaService: PrismaService;

  const mockForm = {
    id: 1,
    title: 'Test Form',
    type: 'SIGNAL',
    reference: 'TEST_FORM',
    description: 'Test Description',
    context_id: 1,
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    context: {
      id: 1,
      name: 'Test Context',
    },
    form_version: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormsService,
        {
          provide: PrismaService,
          useValue: {
            form: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            form_version: {
              findMany: jest.fn(),
              count: jest.fn(),
              updateMany: jest.fn(),
            },
            report: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FormsService>(FormsService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar formulário com contexto do usuário gerenciador', async () => {
      const createFormDto: CreateFormDto = {
        title: 'Test Form',
        type: 'signal',
        active: true,
      };

      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'create').mockResolvedValue(mockForm as any);

      const result = await service.create(createFormDto, 1);

      expect(userContextHelper.getUserContextAsManager).toHaveBeenCalledWith(prismaService, 1);
      expect(result).toHaveProperty('id', 1);
    });

    it('deve usar getUserContextAsManager helper', async () => {
      const createFormDto: CreateFormDto = {
        title: 'Test Form',
        type: 'signal',
      };

      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'create').mockResolvedValue(mockForm as any);

      await service.create(createFormDto, 1);

      expect(userContextHelper.getUserContextAsManager).toHaveBeenCalled();
    });

    it('deve incluir reference quando fornecido', async () => {
      const createFormDto: CreateFormDto = {
        title: 'Test Form',
        type: 'signal',
        reference: 'TEST_REF',
      };

      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'create').mockResolvedValue(mockForm as any);

      await service.create(createFormDto, 1);

      expect(prismaService.form.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reference: 'TEST_REF',
        }),
      });
    });

    it('deve incluir description quando fornecido', async () => {
      const createFormDto: CreateFormDto = {
        title: 'Test Form',
        type: 'signal',
        description: 'Test Description',
      };

      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'create').mockResolvedValue(mockForm as any);

      await service.create(createFormDto, 1);

      expect(prismaService.form.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'Test Description',
        }),
      });
    });
  });

  describe('findFormsWithLatestVersions', () => {
    it('deve retornar apenas formulários do contexto do usuário', async () => {
      const mockFormWithVersion = {
        ...mockForm,
        form_version: [
          {
            id: 1,
            form_id: 1,
            version_number: 1,
            access_type: 'PUBLIC',
            definition: {},
            active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      (userContextHelper.getUserContextId as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([mockFormWithVersion] as any);

      const result = await service.findFormsWithLatestVersions(1);

      expect(userContextHelper.getUserContextId).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('formId', 1);
    });

    it('deve retornar apenas última versão ativa', async () => {
      const mockFormWithVersions = {
        ...mockForm,
        form_version: [
          {
            id: 2,
            form_id: 1,
            version_number: 2,
            access_type: 'PUBLIC',
            definition: {},
            active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 1,
            form_id: 1,
            version_number: 1,
            access_type: 'PUBLIC',
            definition: {},
            active: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      (userContextHelper.getUserContextId as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([mockFormWithVersions] as any);

      const result = await service.findFormsWithLatestVersions(1);

      expect(result[0].version.versionNumber).toBe(2);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const query: FormQueryDto = {
        page: 1,
        pageSize: 20,
      };

      (userContextHelper.getUserContextId as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([mockForm] as any);
      jest.spyOn(prismaService.form, 'count').mockResolvedValue(1);

      const result = await service.findAll(query, 1);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });

    it('deve filtrar por contexto do usuário', async () => {
      const query: FormQueryDto = {
        page: 1,
        pageSize: 20,
      };

      (userContextHelper.getUserContextId as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prismaService.form, 'count').mockResolvedValue(0);

      await service.findAll(query, 1);

      expect(prismaService.form.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            context_id: 1,
          }),
        }),
      );
    });

    it('deve aplicar filtros adicionais', async () => {
      const query: FormQueryDto = {
        page: 1,
        pageSize: 20,
        type: 'signal',
        reference: 'TEST_FORM',
      };

      (userContextHelper.getUserContextId as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prismaService.form, 'count').mockResolvedValue(0);

      await service.findAll(query, 1);

      expect(prismaService.form.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'signal',
            reference: 'TEST_FORM',
          }),
        }),
      );
    });

    it('deve aplicar filtro type quando fornecido', async () => {
      const query: FormQueryDto = {
        page: 1,
        pageSize: 20,
        type: 'quiz',
      };

      (userContextHelper.getUserContextId as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prismaService.form, 'count').mockResolvedValue(0);

      await service.findAll(query, 1);

      expect(prismaService.form.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'quiz',
          }),
        }),
      );
    });

    it('deve aplicar filtro reference quando fornecido', async () => {
      const query: FormQueryDto = {
        page: 1,
        pageSize: 20,
        reference: 'TEST_REF',
      };

      (userContextHelper.getUserContextId as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prismaService.form, 'count').mockResolvedValue(0);

      await service.findAll(query, 1);

      expect(prismaService.form.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reference: 'TEST_REF',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar formulário quando existe', async () => {
      (userContextHelper.getUserContextId as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(mockForm as any);

      const result = await service.findOne(1, 1);

      expect(result).toHaveProperty('id', 1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      (userContextHelper.getUserContextId as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException quando não pertence ao contexto', async () => {
      (userContextHelper.getUserContextId as jest.Mock).mockResolvedValue(2);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(mockForm as any);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('deve atualizar campos fornecidos', async () => {
      const updateFormDto: UpdateFormDto = {
        title: 'Updated Form',
      };

      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(mockForm as any);
      jest.spyOn(prismaService.form, 'update').mockResolvedValue({
        ...mockForm,
        title: 'Updated Form',
      } as any);

      const result = await service.update(1, updateFormDto, 1);

      expect(result).toHaveProperty('title', 'Updated Form');
    });

    it('deve atualizar type quando fornecido', async () => {
      const updateFormDto: UpdateFormDto = {
        type: 'quiz',
      };

      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(mockForm as any);
      jest.spyOn(prismaService.form, 'update').mockResolvedValue({
        ...mockForm,
        type: 'quiz',
      } as any);

      await service.update(1, updateFormDto, 1);

      expect(prismaService.form.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { type: 'quiz' },
      });
    });

    it('deve atualizar reference quando fornecido', async () => {
      const updateFormDto: UpdateFormDto = {
        reference: 'UPDATED_REF',
      };

      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(mockForm as any);
      jest.spyOn(prismaService.form, 'update').mockResolvedValue(mockForm as any);

      await service.update(1, updateFormDto, 1);

      expect(prismaService.form.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { reference: 'UPDATED_REF' },
      });
    });

    it('deve atualizar description quando fornecido', async () => {
      const updateFormDto: UpdateFormDto = {
        description: 'Updated Description',
      };

      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(mockForm as any);
      jest.spyOn(prismaService.form, 'update').mockResolvedValue(mockForm as any);

      await service.update(1, updateFormDto, 1);

      expect(prismaService.form.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { description: 'Updated Description' },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateFormDto: UpdateFormDto = {
        title: 'Updated Form',
      };

      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(null);

      await expect(service.update(999, updateFormDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException quando não pertence ao contexto', async () => {
      const updateFormDto: UpdateFormDto = {
        title: 'Updated Form',
      };

      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(2);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(mockForm as any);

      await expect(service.update(1, updateFormDto, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('deve desativar formulário sem versões', async () => {
      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(mockForm as any);
      jest.spyOn(prismaService.form_version, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.form, 'update').mockResolvedValue({
        ...mockForm,
        active: false,
      } as any);

      await service.remove(1, 1);

      expect(prismaService.form.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
      expect(prismaService.form_version.updateMany).not.toHaveBeenCalled();
    });

    it('deve desativar versões antes de desativar formulário', async () => {
      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(mockForm as any);
      jest.spyOn(prismaService.form_version, 'findMany').mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ] as any);
      jest.spyOn(prismaService.report, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.form_version, 'updateMany').mockResolvedValue({ count: 2 } as any);
      jest.spyOn(prismaService.form, 'update').mockResolvedValue({
        ...mockForm,
        active: false,
      } as any);

      await service.remove(1, 1);

      expect(prismaService.form_version.updateMany).toHaveBeenCalledWith({
        where: { form_id: 1 },
        data: { active: false },
      });
      expect(prismaService.form.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException quando não pertence ao contexto', async () => {
      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(2);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(mockForm as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar BadRequestException quando alguma versão possui reports', async () => {
      (userContextHelper.getUserContextAsManager as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(mockForm as any);
      jest.spyOn(prismaService.form_version, 'findMany').mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ] as any);
      const reportCountMock = jest
        .spyOn(prismaService.report, 'count')
        .mockResolvedValueOnce(0) // primeira versão sem reports
        .mockResolvedValueOnce(3); // segunda versão com 3 reports

      await expect(service.remove(1, 1)).rejects.toThrow(
        'Não é possível deletar formulário. A versão 2 possui 3 report(s) associado(s)',
      );

      expect(reportCountMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('mapToResponseDto', () => {
    it('deve mapear todos os campos corretamente', async () => {
      (userContextHelper.getUserContextId as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(mockForm as any);

      const result = await service.findOne(1, 1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('title', 'Test Form');
      expect(result).toHaveProperty('context');
    });

    it('deve incluir context e latestVersion quando disponíveis', async () => {
      const formWithVersion = {
        ...mockForm,
        form_version: [
          {
            id: 1,
            form_id: 1,
            version_number: 1,
            access_type: 'PUBLIC',
            definition: {},
            active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      (userContextHelper.getUserContextId as jest.Mock).mockResolvedValue(1);
      jest.spyOn(prismaService.form, 'findUnique').mockResolvedValue(formWithVersion as any);

      const result = await service.findOne(1, 1);

      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('latestVersion');
    });
  });
});
