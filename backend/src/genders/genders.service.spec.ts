import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GendersService } from './genders.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('GendersService', () => {
  let service: GendersService;
  let prismaService: PrismaService;

  const mockGender = {
    id: 1,
    name: 'Masculino',
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  const mockPrismaService = {
    gender: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GendersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GendersService>(GendersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve retornar todos os gêneros ativos', async () => {
      const mockGenders = [
        {
          id: 1,
          name: 'Masculino',
          active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        },
        {
          id: 2,
          name: 'Feminino',
          active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        },
      ];

      mockPrismaService.gender.findMany.mockResolvedValue(mockGenders);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Masculino');
      expect(result[1].name).toBe('Feminino');
      expect(mockPrismaService.gender.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
    });

    it('deve retornar array vazio quando não há gêneros', async () => {
      mockPrismaService.gender.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });

    it('deve filtrar por activeOnly quando fornecido', async () => {
      mockPrismaService.gender.findMany.mockResolvedValue([]);

      await service.findAll(false);

      expect(mockPrismaService.gender.findMany).toHaveBeenCalledWith({
        where: { active: false },
        orderBy: { name: 'asc' },
      });
    });

    it('deve mapear todos os campos corretamente', async () => {
      const mockGenders = [mockGender];

      mockPrismaService.gender.findMany.mockResolvedValue(mockGenders);

      const result = await service.findAll();

      expect(result[0]).toEqual({
        id: 1,
        name: 'Masculino',
        active: true,
        createdAt: mockGender.created_at,
        updatedAt: mockGender.updated_at,
      });
    });
  });

  describe('findOne', () => {
    it('deve retornar gênero quando existe', async () => {
      mockPrismaService.gender.findUnique.mockResolvedValue(mockGender);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Masculino');
      expect(mockPrismaService.gender.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      mockPrismaService.gender.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Gênero com ID 999 não encontrado',
      );
    });
  });

  describe('create', () => {
    it('deve criar gênero com sucesso', async () => {
      const createDto = { name: 'Novo Gênero' };

      mockPrismaService.gender.create.mockResolvedValue(mockGender);

      const result = await service.create(createDto);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Masculino');
      expect(mockPrismaService.gender.create).toHaveBeenCalledWith({
        data: { name: 'Novo Gênero' },
      });
    });

    it('deve lançar BadRequestException quando nome já existe', async () => {
      const createDto = { name: 'Gênero Existente' };

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.gender.create.mockRejectedValue(prismaError);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Já existe um gênero com esse nome',
      );
    });

    it('deve propagar outros erros', async () => {
      const createDto = { name: 'Novo Gênero' };
      const genericError = new Error('Database error');

      mockPrismaService.gender.create.mockRejectedValue(genericError);

      await expect(service.create(createDto)).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    it('deve atualizar gênero com sucesso', async () => {
      const updateDto = { name: 'Gênero Atualizado' };
      const updatedGender = { ...mockGender, name: 'Gênero Atualizado' };

      mockPrismaService.gender.update.mockResolvedValue(updatedGender);

      const result = await service.update(1, updateDto);

      expect(result).toHaveProperty('name', 'Gênero Atualizado');
      expect(mockPrismaService.gender.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          ...updateDto,
          updated_at: expect.any(Date),
        },
      });
    });

    it('deve atualizar status ativo', async () => {
      const updateDto = { active: false };
      const updatedGender = { ...mockGender, active: false };

      mockPrismaService.gender.update.mockResolvedValue(updatedGender);

      const result = await service.update(1, updateDto);

      expect(result).toHaveProperty('active', false);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateDto = { name: 'Gênero Atualizado' };

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found',
        {
          code: 'P2025',
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.gender.update.mockRejectedValue(prismaError);

      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException quando nome já existe', async () => {
      const updateDto = { name: 'Gênero Existente' };

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.gender.update.mockRejectedValue(prismaError);

      await expect(service.update(1, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, updateDto)).rejects.toThrow(
        'Já existe um gênero com esse nome',
      );
    });
  });

  describe('remove', () => {
    it('deve deletar gênero quando não há usuários associados', async () => {
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.gender.delete.mockResolvedValue(mockGender);

      await service.remove(1);

      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: { gender_id: 1 },
      });
      expect(mockPrismaService.gender.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve lançar BadRequestException quando há usuários associados', async () => {
      mockPrismaService.user.count.mockResolvedValue(5);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
      await expect(service.remove(1)).rejects.toThrow(
        'Não é possível deletar o gênero pois existem 5 usuário(s) associado(s)',
      );
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      mockPrismaService.user.count.mockResolvedValue(0);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record to delete not found',
        {
          code: 'P2025',
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.gender.delete.mockRejectedValue(prismaError);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
