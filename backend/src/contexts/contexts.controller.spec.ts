import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContextsController } from './contexts.controller';
import { ContextsService } from './contexts.service';
import { CreateContextDto } from './dto/create-context.dto';
import { UpdateContextDto } from './dto/update-context.dto';
import { ContextQueryDto } from './dto/context-query.dto';
import { ContextResponseDto } from './dto/context-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

describe('ContextsController', () => {
  let controller: ContextsController;
  let contextsService: ContextsService;

  const mockContext: ContextResponseDto = {
    id: 1,
    name: 'Test Context',
    locationId: 1,
    description: 'Test Description',
    type: 'TEST',
    accessType: 'PUBLIC',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockListResponse: ListResponseDto<ContextResponseDto> = {
    data: [mockContext],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    links: {
      first: '/v1/contexts?page=1&pageSize=20',
      last: '/v1/contexts?page=1&pageSize=20',
      prev: null,
      next: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContextsController],
      providers: [
        {
          provide: ContextsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ContextsController>(ContextsController);
    contextsService = module.get<ContextsService>(ContextsService);
  });

  describe('create', () => {
    it('deve criar contexto com sucesso', async () => {
      const createContextDto: CreateContextDto = {
        name: 'Test Context',
        accessType: 'PUBLIC',
        active: true,
      };

      jest.spyOn(contextsService, 'create').mockResolvedValue(mockContext);

      const result = await controller.create(createContextDto);

      expect(result).toEqual(mockContext);
      expect(contextsService.create).toHaveBeenCalledWith(createContextDto);
    });

    it('deve lançar BadRequestException quando location não existe', async () => {
      const createContextDto: CreateContextDto = {
        name: 'Test Context',
        accessType: 'PUBLIC',
        locationId: 999,
      };

      jest
        .spyOn(contextsService, 'create')
        .mockRejectedValue(
          new BadRequestException('Localização não encontrada'),
        );

      await expect(controller.create(createContextDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const query: ContextQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(contextsService, 'findAll')
        .mockResolvedValue(mockListResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockListResponse);
    });

    it('deve filtrar por active, locationId e accessType', async () => {
      const query: ContextQueryDto = {
        page: 1,
        pageSize: 20,
        active: false,
        locationId: 1,
        accessType: 'PUBLIC',
      };

      jest
        .spyOn(contextsService, 'findAll')
        .mockResolvedValue(mockListResponse);

      await controller.findAll(query);

      expect(contextsService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('deve retornar contexto quando existe', async () => {
      jest.spyOn(contextsService, 'findOne').mockResolvedValue(mockContext);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockContext);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(contextsService, 'findOne')
        .mockRejectedValue(new NotFoundException('Contexto não encontrado'));

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar contexto com sucesso', async () => {
      const updateContextDto: UpdateContextDto = {
        name: 'Updated Context',
      };

      const updatedContext = { ...mockContext, name: 'Updated Context' };
      jest.spyOn(contextsService, 'update').mockResolvedValue(updatedContext);

      const result = await controller.update(1, updateContextDto);

      expect(result).toEqual(updatedContext);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateContextDto: UpdateContextDto = {
        name: 'Updated Context',
      };

      jest
        .spyOn(contextsService, 'update')
        .mockRejectedValue(new NotFoundException('Contexto não encontrado'));

      await expect(controller.update(999, updateContextDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException quando location não existe', async () => {
      const updateContextDto: UpdateContextDto = {
        locationId: 999,
      };

      jest
        .spyOn(contextsService, 'update')
        .mockRejectedValue(
          new BadRequestException('Localização não encontrada'),
        );

      await expect(controller.update(1, updateContextDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('deve desativar contexto', async () => {
      jest.spyOn(contextsService, 'remove').mockResolvedValue(undefined);

      await controller.remove(1);

      expect(contextsService.remove).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(contextsService, 'remove')
        .mockRejectedValue(new NotFoundException('Contexto não encontrado'));

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando possui participações', async () => {
      jest
        .spyOn(contextsService, 'remove')
        .mockRejectedValue(
          new BadRequestException('Contexto possui participações'),
        );

      await expect(controller.remove(1)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando possui formulários', async () => {
      jest
        .spyOn(contextsService, 'remove')
        .mockRejectedValue(
          new BadRequestException('Contexto possui formulários'),
        );

      await expect(controller.remove(1)).rejects.toThrow(BadRequestException);
    });
  });
});
