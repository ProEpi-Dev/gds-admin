import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TagService } from './tag.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('TagService', () => {
  let service: TagService;
  let prismaService: PrismaService;

  const mockTag = {
    id: 1,
    name: 'Test Tag',
    color: '#FF0000',
    description: 'Test description',
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagService,
        {
          provide: PrismaService,
          useValue: {
            tag: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TagService>(TagService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar lista de tags ordenadas por nome', async () => {
      const mockTags = [mockTag, { ...mockTag, id: 2, name: 'Another Tag' }];
      jest.spyOn(prismaService.tag, 'findMany').mockResolvedValue(mockTags as any);

      const result = await service.findAll();

      expect(result).toEqual(mockTags);
      expect(prismaService.tag.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('deve retornar array vazio quando não há tags', async () => {
      jest.spyOn(prismaService.tag, 'findMany').mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('deve criar tag com todos os campos', async () => {
      const createData = {
        name: 'New Tag',
        color: '#00FF00',
        description: 'New description',
      };

      jest.spyOn(prismaService.tag, 'create').mockResolvedValue(mockTag as any);

      const result = await service.create(createData);

      expect(result).toEqual(mockTag);
      expect(prismaService.tag.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('deve criar tag sem campos opcionais', async () => {
      const createData = {
        name: 'New Tag',
      };

      jest.spyOn(prismaService.tag, 'create').mockResolvedValue(mockTag as any);

      const result = await service.create(createData);

      expect(result).toEqual(mockTag);
      expect(prismaService.tag.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('deve lançar BadRequestException quando nome já existe', async () => {
      const createData = {
        name: 'Existing Tag',
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        },
      );

      jest.spyOn(prismaService.tag, 'create').mockRejectedValue(prismaError);

      await expect(service.create(createData)).rejects.toThrow(BadRequestException);
      await expect(service.create(createData)).rejects.toThrow(
        'Já existe uma tag com esse nome',
      );
    });

    it('deve propagar outros erros', async () => {
      const createData = {
        name: 'New Tag',
      };

      const genericError = new Error('Database error');
      jest.spyOn(prismaService.tag, 'create').mockRejectedValue(genericError);

      await expect(service.create(createData)).rejects.toThrow('Database error');
    });
  });

  describe('findOne', () => {
    it('deve retornar tag quando existe', async () => {
      jest.spyOn(prismaService.tag, 'findUnique').mockResolvedValue(mockTag as any);

      const result = await service.findOne(1);

      expect(result).toEqual(mockTag);
      expect(prismaService.tag.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve retornar null quando tag não existe', async () => {
      jest.spyOn(prismaService.tag, 'findUnique').mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar tag com todos os campos', async () => {
      const updateData = {
        name: 'Updated Tag',
        color: '#0000FF',
        description: 'Updated description',
        active: false,
      };

      const updatedTag = { ...mockTag, ...updateData };
      jest.spyOn(prismaService.tag, 'update').mockResolvedValue(updatedTag as any);

      const result = await service.update(1, updateData);

      expect(result).toEqual(updatedTag);
      expect(prismaService.tag.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          ...updateData,
          updated_at: expect.any(Date),
        },
      });
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      const updateData = {
        name: 'Updated Tag',
      };

      jest.spyOn(prismaService.tag, 'update').mockResolvedValue(mockTag as any);

      await service.update(1, updateData);

      expect(prismaService.tag.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Updated Tag',
          updated_at: expect.any(Date),
        },
      });
    });

    it('deve lançar BadRequestException quando nome já existe', async () => {
      const updateData = {
        name: 'Existing Tag',
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        },
      );

      jest.spyOn(prismaService.tag, 'update').mockRejectedValue(prismaError);

      await expect(service.update(1, updateData)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateData)).rejects.toThrow(
        'Já existe uma tag com esse nome',
      );
    });

    it('deve propagar outros erros', async () => {
      const updateData = {
        name: 'Updated Tag',
      };

      const genericError = new Error('Database error');
      jest.spyOn(prismaService.tag, 'update').mockRejectedValue(genericError);

      await expect(service.update(1, updateData)).rejects.toThrow('Database error');
    });
  });

  describe('remove', () => {
    it('deve deletar tag', async () => {
      jest.spyOn(prismaService.tag, 'delete').mockResolvedValue(mockTag as any);

      const result = await service.remove(1);

      expect(result).toEqual(mockTag);
      expect(prismaService.tag.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
