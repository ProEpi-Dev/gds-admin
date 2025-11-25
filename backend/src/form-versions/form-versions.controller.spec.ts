import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FormVersionsController } from './form-versions.controller';
import { FormVersionsService } from './form-versions.service';
import { CreateFormVersionDto } from './dto/create-form-version.dto';
import { UpdateFormVersionDto } from './dto/update-form-version.dto';
import { FormVersionQueryDto } from './dto/form-version-query.dto';
import { FormVersionResponseDto } from './dto/form-version-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

describe('FormVersionsController', () => {
  let controller: FormVersionsController;
  let formVersionsService: FormVersionsService;

  const mockFormVersion: FormVersionResponseDto = {
    id: 1,
    formId: 1,
    versionNumber: 1,
    accessType: 'PUBLIC',
    definition: {},
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockListResponse: ListResponseDto<FormVersionResponseDto> = {
    data: [mockFormVersion],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    links: {
      first: '/v1/forms/1/versions?page=1&pageSize=20',
      last: '/v1/forms/1/versions?page=1&pageSize=20',
      prev: null,
      next: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormVersionsController],
      providers: [
        {
          provide: FormVersionsService,
          useValue: {
            create: jest.fn(),
            findAllByForm: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FormVersionsController>(FormVersionsController);
    formVersionsService = module.get<FormVersionsService>(FormVersionsService);
  });

  describe('create', () => {
    it('deve criar versão com sucesso', async () => {
      const createDto: CreateFormVersionDto = {
        accessType: 'PUBLIC',
        definition: {},
        active: true,
      };

      jest.spyOn(formVersionsService, 'create').mockResolvedValue(mockFormVersion);

      const result = await controller.create(1, createDto);

      expect(result).toEqual(mockFormVersion);
      expect(formVersionsService.create).toHaveBeenCalledWith(1, createDto);
    });

    it('deve lançar NotFoundException quando form não existe', async () => {
      const createDto: CreateFormVersionDto = {
        accessType: 'PUBLIC',
        definition: {},
      };

      jest
        .spyOn(formVersionsService, 'create')
        .mockRejectedValue(new NotFoundException('Formulário não encontrado'));

      await expect(controller.create(999, createDto)).rejects.toThrow(NotFoundException);
    });

    it('deve calcular número de versão automaticamente', async () => {
      const createDto: CreateFormVersionDto = {
        accessType: 'PUBLIC',
        definition: {},
      };

      jest.spyOn(formVersionsService, 'create').mockResolvedValue(mockFormVersion);

      await controller.create(1, createDto);

      expect(formVersionsService.create).toHaveBeenCalledWith(1, createDto);
    });
  });

  describe('findAllByForm', () => {
    it('deve retornar lista paginada', async () => {
      const query: FormVersionQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(formVersionsService, 'findAllByForm').mockResolvedValue(mockListResponse);

      const result = await controller.findAllByForm(1, query);

      expect(result).toEqual(mockListResponse);
    });

    it('deve lançar NotFoundException quando form não existe', async () => {
      const query: FormVersionQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(formVersionsService, 'findAllByForm')
        .mockRejectedValue(new NotFoundException('Formulário não encontrado'));

      await expect(controller.findAllByForm(999, query)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('deve retornar versão quando existe', async () => {
      jest.spyOn(formVersionsService, 'findOne').mockResolvedValue(mockFormVersion);

      const result = await controller.findOne(1, 1);

      expect(result).toEqual(mockFormVersion);
    });

    it('deve lançar NotFoundException quando form não existe', async () => {
      jest
        .spyOn(formVersionsService, 'findOne')
        .mockRejectedValue(new NotFoundException('Formulário não encontrado'));

      await expect(controller.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException quando versão não existe', async () => {
      jest
        .spyOn(formVersionsService, 'findOne')
        .mockRejectedValue(new NotFoundException('Versão não encontrada'));

      await expect(controller.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar versão com sucesso', async () => {
      const updateDto: UpdateFormVersionDto = {
        accessType: 'PRIVATE',
      };

      const updatedVersion = { ...mockFormVersion, accessType: 'PRIVATE' as const };
      jest.spyOn(formVersionsService, 'update').mockResolvedValue(updatedVersion);

      const result = await controller.update(1, 1, updateDto);

      expect(result).toEqual(updatedVersion);
    });

    it('deve criar nova versão quando definition muda', async () => {
      const updateDto: UpdateFormVersionDto = {
        definition: { newField: 'value' },
      };

      const newVersion = { ...mockFormVersion, id: 2, versionNumber: 2 };
      jest.spyOn(formVersionsService, 'update').mockResolvedValue(newVersion);

      const result = await controller.update(1, 1, updateDto);

      expect(result).toHaveProperty('versionNumber', 2);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateDto: UpdateFormVersionDto = {
        accessType: 'PRIVATE',
      };

      jest
        .spyOn(formVersionsService, 'update')
        .mockRejectedValue(new NotFoundException('Versão não encontrada'));

      await expect(controller.update(1, 999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deve desativar versão', async () => {
      jest.spyOn(formVersionsService, 'remove').mockResolvedValue(undefined);

      await controller.remove(1, 1);

      expect(formVersionsService.remove).toHaveBeenCalledWith(1, 1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(formVersionsService, 'remove')
        .mockRejectedValue(new NotFoundException('Versão não encontrada'));

      await expect(controller.remove(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando possui reports', async () => {
      jest
        .spyOn(formVersionsService, 'remove')
        .mockRejectedValue(new BadRequestException('Versão possui reports'));

      await expect(controller.remove(1, 1)).rejects.toThrow(BadRequestException);
    });
  });
});

