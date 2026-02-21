import { Test, TestingModule } from '@nestjs/testing';
import { ContentTypeService } from './content-type.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('ContentTypeService', () => {
  let service: ContentTypeService;
  let prismaService: PrismaService;

  const mockContentType = {
    id: 1,
    name: 'Video',
    color: '#FF0000',
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentTypeService,
        {
          provide: PrismaService,
          useValue: {
            content_type: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            content: {
              updateMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContentTypeService>(ContentTypeService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar lista de tipos ativos', async () => {
      const mockTypes = [mockContentType];
      jest
        .spyOn(prismaService.content_type, 'findMany')
        .mockResolvedValue(mockTypes as any);

      const result = await service.findAll();

      expect(result).toEqual(mockTypes);
      expect(prismaService.content_type.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
    });

    it('deve retornar array vazio quando não há tipos', async () => {
      jest.spyOn(prismaService.content_type, 'findMany').mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findAllForAdmin', () => {
    it('deve retornar todos os tipos incluindo inativos', async () => {
      const allTypes = [
        mockContentType,
        { ...mockContentType, id: 2, active: false },
      ];
      jest
        .spyOn(prismaService.content_type, 'findMany')
        .mockResolvedValue(allTypes as any);

      const result = await service.findAllForAdmin();

      expect(result).toEqual(allTypes);
      expect(prismaService.content_type.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('deve criar um novo tipo de conteúdo', async () => {
      const createDto = {
        name: 'Video',
        color: '#FF0000',
      };

      jest
        .spyOn(prismaService.content_type, 'create')
        .mockResolvedValue(mockContentType as any);

      const result = await service.create(createDto);

      expect(result).toEqual(mockContentType);
      expect(prismaService.content_type.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('deve lançar BadRequestException se nome já existe', async () => {
      const createDto = {
        name: 'Video',
        color: '#FF0000',
      };

      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        },
      );

      jest.spyOn(prismaService.content_type, 'create').mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve relançar outro erro que não seja de constraint única', async () => {
      const createDto = {
        name: 'Video',
        color: '#FF0000',
      };

      const error = new Error('Database connection failed');

      jest.spyOn(prismaService.content_type, 'create').mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar tipo por id', async () => {
      jest
        .spyOn(prismaService.content_type, 'findUnique')
        .mockResolvedValue(mockContentType as any);

      const result = await service.findOne(1);

      expect(result).toEqual(mockContentType);
      expect(prismaService.content_type.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve retornar null se tipo não existe', async () => {
      jest
        .spyOn(prismaService.content_type, 'findUnique')
        .mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar tipo de conteúdo', async () => {
      const updateDto = {
        name: 'Updated Video',
      };

      const updated = { ...mockContentType, ...updateDto };
      jest
        .spyOn(prismaService.content_type, 'update')
        .mockResolvedValue(updated as any);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(updated);
      expect(prismaService.content_type.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          ...updateDto,
          updated_at: expect.any(Date),
        },
      });
    });

    it('deve lançar BadRequestException se nome já existe', async () => {
      const updateDto = { name: 'Existing Name' };

      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        },
      );

      jest.spyOn(prismaService.content_type, 'update').mockRejectedValue(error);

      await expect(service.update(1, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('deve deletar tipo de conteúdo', async () => {
      jest
        .spyOn(prismaService.content_type, 'delete')
        .mockResolvedValue(mockContentType as any);

      const result = await service.remove(1);

      expect(result).toEqual(mockContentType);
      expect(prismaService.content_type.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve lançar BadRequestException se há conteúdos associados', async () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
        },
      );

      jest.spyOn(prismaService.content_type, 'delete').mockRejectedValue(error);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });

    it('deve relançar outro erro que não seja foreign key', async () => {
      const error = new Error('Database error');

      jest.spyOn(prismaService.content_type, 'delete').mockRejectedValue(error);

      await expect(service.remove(1)).rejects.toThrow('Database error');
    });
  });

  describe('softDelete', () => {
    it('deve desativar tipo de conteúdo (soft delete)', async () => {
      const inactive = { ...mockContentType, active: false };
      const updateManyResult = { count: 2 };

      jest
        .spyOn(prismaService.content, 'updateMany')
        .mockResolvedValue(updateManyResult as any);
      jest
        .spyOn(prismaService.content_type, 'update')
        .mockResolvedValue(inactive as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockResolvedValue([updateManyResult, inactive] as any);

      const result = await service.softDelete(1);

      expect(result).toEqual(inactive);
      expect(prismaService.content.updateMany).toHaveBeenCalledWith({
        where: { type_id: 1 },
        data: { type_id: null },
      });
      expect(prismaService.content_type.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          active: false,
          updated_at: expect.any(Date),
        },
      });
      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
