import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ContextManagersService } from './context-managers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContextManagerDto } from './dto/create-context-manager.dto';
import { UpdateContextManagerDto } from './dto/update-context-manager.dto';
import { ContextManagerQueryDto } from './dto/context-manager-query.dto';

describe('ContextManagersService', () => {
  let service: ContextManagersService;
  let prismaService: PrismaService;

  const mockContextManager = {
    id: 1,
    user_id: 1,
    context_id: 1,
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockContext = { id: 1, name: 'Test Context' };
  const mockUser = { id: 1, name: 'Test User' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextManagersService,
        {
          provide: PrismaService,
          useValue: {
            context: {
              findUnique: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            context_manager: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ContextManagersService>(ContextManagersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('deve criar manager com sucesso', async () => {
      const createDto: CreateContextManagerDto = { userId: 1, active: true };

      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(mockContext as any);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.context_manager, 'create').mockResolvedValue(mockContextManager as any);

      const result = await service.create(1, createDto);

      expect(result).toHaveProperty('id', 1);
    });

    it('deve validar context e user', async () => {
      const createDto: CreateContextManagerDto = { userId: 1 };

      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(mockContext as any);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.context_manager, 'create').mockResolvedValue(mockContextManager as any);

      await service.create(1, createDto);

      expect(prismaService.context.findUnique).toHaveBeenCalled();
      expect(prismaService.user.findUnique).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando context não existe', async () => {
      const createDto: CreateContextManagerDto = { userId: 1 };

      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(null);

      await expect(service.create(999, createDto)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando user não existe', async () => {
      const createDto: CreateContextManagerDto = { userId: 999 };

      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(mockContext as any);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.create(1, createDto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar ConflictException quando já é manager', async () => {
      const createDto: CreateContextManagerDto = { userId: 1 };

      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(mockContext as any);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);

      await expect(service.create(1, createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllByContext', () => {
    it('deve retornar lista paginada', async () => {
      const query: ContextManagerQueryDto = { page: 1, pageSize: 20 };

      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(mockContext as any);
      jest.spyOn(prismaService.context_manager, 'findMany').mockResolvedValue([mockContextManager] as any);
      jest.spyOn(prismaService.context_manager, 'count').mockResolvedValue(1);

      const result = await service.findAllByContext(1, query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });

    it('deve lançar NotFoundException quando context não existe', async () => {
      const query: ContextManagerQueryDto = { page: 1, pageSize: 20 };

      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(null);

      await expect(service.findAllByContext(999, query)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('deve retornar manager quando existe', async () => {
      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(mockContext as any);
      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);

      const result = await service.findOne(1, 1);

      expect(result).toHaveProperty('id', 1);
    });

    it('deve lançar NotFoundException quando context não existe', async () => {
      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException quando manager não existe', async () => {
      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(mockContext as any);
      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar campos fornecidos', async () => {
      const updateDto: UpdateContextManagerDto = { active: false };

      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);
      jest.spyOn(prismaService.context_manager, 'update').mockResolvedValue({
        ...mockContextManager,
        active: false,
      } as any);

      const result = await service.update(1, 1, updateDto);

      expect(result).toHaveProperty('active', false);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateDto: UpdateContextManagerDto = { active: false };

      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(null);

      await expect(service.update(1, 999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deve desativar manager', async () => {
      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);
      jest.spyOn(prismaService.context_manager, 'update').mockResolvedValue({
        ...mockContextManager,
        active: false,
      } as any);

      await service.remove(1, 1);

      expect(prismaService.context_manager.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('mapToResponseDto', () => {
    it('deve mapear todos os campos corretamente', async () => {
      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(mockContext as any);
      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);

      const result = await service.findOne(1, 1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('userId', 1);
      expect(result).toHaveProperty('contextId', 1);
    });
  });
});

