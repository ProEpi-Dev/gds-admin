import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ContextManagersController } from './context-managers.controller';
import { ContextManagersService } from './context-managers.service';
import { CreateContextManagerDto } from './dto/create-context-manager.dto';
import { UpdateContextManagerDto } from './dto/update-context-manager.dto';
import { ContextManagerQueryDto } from './dto/context-manager-query.dto';
import { ContextManagerResponseDto } from './dto/context-manager-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

describe('ContextManagersController', () => {
  let controller: ContextManagersController;
  let contextManagersService: ContextManagersService;

  const mockContextManager: ContextManagerResponseDto = {
    id: 1,
    userId: 1,
    contextId: 1,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockListResponse: ListResponseDto<ContextManagerResponseDto> = {
    data: [mockContextManager],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    links: {
      first: '/v1/contexts/1/managers?page=1&pageSize=20',
      last: '/v1/contexts/1/managers?page=1&pageSize=20',
      prev: null,
      next: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContextManagersController],
      providers: [
        {
          provide: ContextManagersService,
          useValue: {
            create: jest.fn(),
            findAllByContext: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ContextManagersController>(
      ContextManagersController,
    );
    contextManagersService = module.get<ContextManagersService>(
      ContextManagersService,
    );
  });

  describe('create', () => {
    it('deve adicionar manager com sucesso', async () => {
      const createDto: CreateContextManagerDto = { userId: 1, active: true };

      jest
        .spyOn(contextManagersService, 'create')
        .mockResolvedValue(mockContextManager);

      const result = await controller.create(1, createDto);

      expect(result).toEqual(mockContextManager);
      expect(contextManagersService.create).toHaveBeenCalledWith(1, createDto);
    });

    it('deve lançar NotFoundException quando context não existe', async () => {
      const createDto: CreateContextManagerDto = { userId: 1 };

      jest
        .spyOn(contextManagersService, 'create')
        .mockRejectedValue(new NotFoundException('Contexto não encontrado'));

      await expect(controller.create(999, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException quando user não existe', async () => {
      const createDto: CreateContextManagerDto = { userId: 999 };

      jest
        .spyOn(contextManagersService, 'create')
        .mockRejectedValue(new BadRequestException('Usuário não encontrado'));

      await expect(controller.create(1, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar ConflictException quando já é manager', async () => {
      const createDto: CreateContextManagerDto = { userId: 1 };

      jest
        .spyOn(contextManagersService, 'create')
        .mockRejectedValue(new ConflictException('Já é manager'));

      await expect(controller.create(1, createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAllByContext', () => {
    it('deve retornar lista paginada', async () => {
      const query: ContextManagerQueryDto = { page: 1, pageSize: 20 };

      jest
        .spyOn(contextManagersService, 'findAllByContext')
        .mockResolvedValue(mockListResponse);

      const result = await controller.findAllByContext(1, query);

      expect(result).toEqual(mockListResponse);
    });

    it('deve lançar NotFoundException quando context não existe', async () => {
      const query: ContextManagerQueryDto = { page: 1, pageSize: 20 };

      jest
        .spyOn(contextManagersService, 'findAllByContext')
        .mockRejectedValue(new NotFoundException('Contexto não encontrado'));

      await expect(controller.findAllByContext(999, query)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar manager quando existe', async () => {
      jest
        .spyOn(contextManagersService, 'findOne')
        .mockResolvedValue(mockContextManager);

      const result = await controller.findOne(1, 1);

      expect(result).toEqual(mockContextManager);
    });

    it('deve lançar NotFoundException quando context não existe', async () => {
      jest
        .spyOn(contextManagersService, 'findOne')
        .mockRejectedValue(new NotFoundException('Contexto não encontrado'));

      await expect(controller.findOne(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar NotFoundException quando manager não existe', async () => {
      jest
        .spyOn(contextManagersService, 'findOne')
        .mockRejectedValue(new NotFoundException('Manager não encontrado'));

      await expect(controller.findOne(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar manager com sucesso', async () => {
      const updateDto: UpdateContextManagerDto = { active: false };

      const updatedManager = { ...mockContextManager, active: false };
      jest
        .spyOn(contextManagersService, 'update')
        .mockResolvedValue(updatedManager);

      const result = await controller.update(1, 1, updateDto);

      expect(result).toEqual(updatedManager);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateDto: UpdateContextManagerDto = { active: false };

      jest
        .spyOn(contextManagersService, 'update')
        .mockRejectedValue(new NotFoundException('Manager não encontrado'));

      await expect(controller.update(1, 999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deve remover manager', async () => {
      jest.spyOn(contextManagersService, 'remove').mockResolvedValue(undefined);

      await controller.remove(1, 1);

      expect(contextManagersService.remove).toHaveBeenCalledWith(1, 1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(contextManagersService, 'remove')
        .mockRejectedValue(new NotFoundException('Manager não encontrado'));

      await expect(controller.remove(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
