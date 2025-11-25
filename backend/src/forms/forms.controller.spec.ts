import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FormQueryDto } from './dto/form-query.dto';
import { FormResponseDto } from './dto/form-response.dto';
import { FormWithVersionDto } from './dto/form-with-version.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

describe('FormsController', () => {
  let controller: FormsController;
  let formsService: FormsService;

  const mockUser = { userId: 1, email: 'test@example.com' };

  const mockForm: FormResponseDto = {
    id: 1,
    contextId: 1,
    context: {
      id: 1,
      locationId: null,
      name: 'Test Context',
      description: null,
      type: null,
      accessType: 'PUBLIC',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    title: 'Test Form',
    reference: 'TEST_FORM',
    description: null,
    type: 'signal',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    latestVersion: null,
  };

  const mockListResponse: ListResponseDto<FormResponseDto> = {
    data: [mockForm],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    links: {
      first: '/v1/forms?page=1&pageSize=20',
      last: '/v1/forms?page=1&pageSize=20',
      prev: null,
      next: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormsController],
      providers: [
        {
          provide: FormsService,
          useValue: {
            create: jest.fn(),
            findFormsWithLatestVersions: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FormsController>(FormsController);
    formsService = module.get<FormsService>(FormsService);
  });

  describe('create', () => {
    it('deve criar formulário com sucesso', async () => {
      const createFormDto: CreateFormDto = {
        title: 'Test Form',
        type: 'signal',
        active: true,
      };

      jest.spyOn(formsService, 'create').mockResolvedValue(mockForm);

      const result = await controller.create(createFormDto, mockUser);

      expect(result).toEqual(mockForm);
      expect(formsService.create).toHaveBeenCalledWith(createFormDto, mockUser.userId);
    });

    it('deve usar contexto do usuário logado', async () => {
      const createFormDto: CreateFormDto = {
        title: 'Test Form',
        type: 'signal',
      };

      jest.spyOn(formsService, 'create').mockResolvedValue(mockForm);

      await controller.create(createFormDto, mockUser);

      expect(formsService.create).toHaveBeenCalledWith(createFormDto, mockUser.userId);
    });
  });

  describe('findFormsWithLatestVersions', () => {
    it('deve retornar formulários com última versão ativa', async () => {
      const mockForms: FormWithVersionDto[] = [
        {
          formId: 1,
          formTitle: 'Test Form',
          version: {
            id: 1,
            formId: 1,
            versionNumber: 1,
            accessType: 'PUBLIC',
            definition: {},
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      jest.spyOn(formsService, 'findFormsWithLatestVersions').mockResolvedValue(mockForms);

      const result = await controller.findFormsWithLatestVersions(mockUser);

      expect(result).toEqual(mockForms);
      expect(formsService.findFormsWithLatestVersions).toHaveBeenCalledWith(mockUser.userId);
    });

    it('deve filtrar apenas formulários do contexto do usuário', async () => {
      jest.spyOn(formsService, 'findFormsWithLatestVersions').mockResolvedValue([]);

      await controller.findFormsWithLatestVersions(mockUser);

      expect(formsService.findFormsWithLatestVersions).toHaveBeenCalledWith(mockUser.userId);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const query: FormQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(formsService, 'findAll').mockResolvedValue(mockListResponse);

      const result = await controller.findAll(query, mockUser);

      expect(result).toEqual(mockListResponse);
    });

    it('deve filtrar por contexto do usuário', async () => {
      const query: FormQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(formsService, 'findAll').mockResolvedValue(mockListResponse);

      await controller.findAll(query, mockUser);

      expect(formsService.findAll).toHaveBeenCalledWith(query, mockUser.userId);
    });

    it('deve aplicar filtros adicionais', async () => {
      const query: FormQueryDto = {
        page: 1,
        pageSize: 20,
        type: 'signal',
      };

      jest.spyOn(formsService, 'findAll').mockResolvedValue(mockListResponse);

      await controller.findAll(query, mockUser);

      expect(formsService.findAll).toHaveBeenCalledWith(query, mockUser.userId);
    });
  });

  describe('findOne', () => {
    it('deve retornar formulário quando existe', async () => {
      jest.spyOn(formsService, 'findOne').mockResolvedValue(mockForm);

      const result = await controller.findOne(1, mockUser);

      expect(result).toEqual(mockForm);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(formsService, 'findOne')
        .mockRejectedValue(new NotFoundException('Formulário não encontrado'));

      await expect(controller.findOne(999, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException quando não pertence ao contexto', async () => {
      jest
        .spyOn(formsService, 'findOne')
        .mockRejectedValue(new ForbiddenException('Você não tem permissão'));

      await expect(controller.findOne(1, mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('deve atualizar formulário com sucesso', async () => {
      const updateFormDto: UpdateFormDto = {
        title: 'Updated Form',
      };

      const updatedForm = { ...mockForm, title: 'Updated Form' };
      jest.spyOn(formsService, 'update').mockResolvedValue(updatedForm);

      const result = await controller.update(1, updateFormDto, mockUser);

      expect(result).toEqual(updatedForm);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateFormDto: UpdateFormDto = {
        title: 'Updated Form',
      };

      jest
        .spyOn(formsService, 'update')
        .mockRejectedValue(new NotFoundException('Formulário não encontrado'));

      await expect(controller.update(999, updateFormDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ForbiddenException quando não pertence ao contexto', async () => {
      const updateFormDto: UpdateFormDto = {
        title: 'Updated Form',
      };

      jest
        .spyOn(formsService, 'update')
        .mockRejectedValue(new ForbiddenException('Você não tem permissão'));

      await expect(controller.update(1, updateFormDto, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('deve desativar formulário', async () => {
      jest.spyOn(formsService, 'remove').mockResolvedValue(undefined);

      await controller.remove(1, mockUser);

      expect(formsService.remove).toHaveBeenCalledWith(1, mockUser.userId);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(formsService, 'remove')
        .mockRejectedValue(new NotFoundException('Formulário não encontrado'));

      await expect(controller.remove(999, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException quando não pertence ao contexto', async () => {
      jest
        .spyOn(formsService, 'remove')
        .mockRejectedValue(new ForbiddenException('Você não tem permissão'));

      await expect(controller.remove(1, mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar BadRequestException quando possui versões', async () => {
      jest
        .spyOn(formsService, 'remove')
        .mockRejectedValue(new BadRequestException('Formulário possui versões'));

      await expect(controller.remove(1, mockUser)).rejects.toThrow(BadRequestException);
    });
  });
});

