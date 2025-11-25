import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';

describe('LocationsService', () => {
  let service: LocationsService;
  let prismaService: PrismaService;

  const mockLocation = {
    id: 1,
    name: 'Test Location',
    parent_id: null,
    latitude: -23.5505,
    longitude: -46.6333,
    polygons: null,
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: PrismaService,
          useValue: {
            location: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('deve criar localização com sucesso', async () => {
      const createLocationDto: CreateLocationDto = {
        name: 'Test Location',
        active: true,
      };

      jest.spyOn(prismaService.location, 'create').mockResolvedValue(mockLocation as any);

      const result = await service.create(createLocationDto);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Test Location');
      expect(prismaService.location.create).toHaveBeenCalled();
    });

    it('deve incluir latitude e longitude quando fornecidos', async () => {
      const createLocationDto: CreateLocationDto = {
        name: 'Test Location',
        latitude: -23.5505,
        longitude: -46.6333,
      };

      jest.spyOn(prismaService.location, 'create').mockResolvedValue(mockLocation as any);

      await service.create(createLocationDto);

      expect(prismaService.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          latitude: -23.5505,
          longitude: -46.6333,
        }),
      });
    });

    it('deve incluir polygons quando fornecido', async () => {
      const createLocationDto: CreateLocationDto = {
        name: 'Test Location',
        polygons: { type: 'Polygon', coordinates: [] },
      };

      jest.spyOn(prismaService.location, 'create').mockResolvedValue(mockLocation as any);

      await service.create(createLocationDto);

      expect(prismaService.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          polygons: createLocationDto.polygons,
        }),
      });
    });

    it('deve validar parent_id quando fornecido', async () => {
      const createLocationDto: CreateLocationDto = {
        name: 'Test Location',
        parentId: 1,
      };

      const mockParent = { id: 1, name: 'Parent Location' };
      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(mockParent as any);
      jest.spyOn(prismaService.location, 'create').mockResolvedValue({
        ...mockLocation,
        parent_id: 1,
      } as any);

      await service.create(createLocationDto);

      expect(prismaService.location.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve lançar BadRequestException quando parent não existe', async () => {
      const createLocationDto: CreateLocationDto = {
        name: 'Test Location',
        parentId: 999,
      };

      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(null);

      await expect(service.create(createLocationDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const query: LocationQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(prismaService.location, 'findMany').mockResolvedValue([mockLocation] as any);
      jest.spyOn(prismaService.location, 'count').mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('links');
      expect(result.data).toHaveLength(1);
    });

    it('deve aplicar filtros corretamente', async () => {
      const query: LocationQueryDto = {
        page: 1,
        pageSize: 20,
        active: false,
        parentId: 1,
      };

      jest.spyOn(prismaService.location, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prismaService.location, 'count').mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: false,
            parent_id: 1,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar localização quando existe', async () => {
      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(mockLocation as any);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
      expect(prismaService.location.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar campos fornecidos', async () => {
      const updateLocationDto: UpdateLocationDto = {
        name: 'Updated Location',
      };

      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(mockLocation as any);
      jest.spyOn(prismaService.location, 'update').mockResolvedValue({
        ...mockLocation,
        name: 'Updated Location',
      } as any);

      const result = await service.update(1, updateLocationDto);

      expect(prismaService.location.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Location' },
      });
      expect(result).toHaveProperty('name', 'Updated Location');
    });

    it('deve atualizar latitude quando fornecido', async () => {
      const updateLocationDto: UpdateLocationDto = {
        latitude: -24.0,
      };

      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(mockLocation as any);
      jest.spyOn(prismaService.location, 'update').mockResolvedValue(mockLocation as any);

      await service.update(1, updateLocationDto);

      expect(prismaService.location.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { latitude: -24.0 },
      });
    });

    it('deve atualizar longitude quando fornecido', async () => {
      const updateLocationDto: UpdateLocationDto = {
        longitude: -47.0,
      };

      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(mockLocation as any);
      jest.spyOn(prismaService.location, 'update').mockResolvedValue(mockLocation as any);

      await service.update(1, updateLocationDto);

      expect(prismaService.location.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { longitude: -47.0 },
      });
    });

    it('deve atualizar polygons quando fornecido', async () => {
      const updateLocationDto: UpdateLocationDto = {
        polygons: { type: 'Polygon', coordinates: [] },
      };

      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(mockLocation as any);
      jest.spyOn(prismaService.location, 'update').mockResolvedValue(mockLocation as any);

      await service.update(1, updateLocationDto);

      expect(prismaService.location.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { polygons: updateLocationDto.polygons },
      });
    });

    it('deve validar parent_id quando fornecido', async () => {
      const updateLocationDto: UpdateLocationDto = {
        parentId: 2,
      };

      const mockParent = { id: 2, name: 'Parent Location' };
      jest.spyOn(prismaService.location, 'findUnique')
        .mockResolvedValueOnce(mockLocation as any)
        .mockResolvedValueOnce(mockParent as any);
      jest.spyOn(prismaService.location, 'update').mockResolvedValue({
        ...mockLocation,
        parent_id: 2,
      } as any);

      await service.update(1, updateLocationDto);

      expect(prismaService.location.findUnique).toHaveBeenCalledTimes(2);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateLocationDto: UpdateLocationDto = {
        name: 'Updated Location',
      };

      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(null);

      await expect(service.update(999, updateLocationDto)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando parent não existe', async () => {
      const updateLocationDto: UpdateLocationDto = {
        parentId: 999,
      };

      jest.spyOn(prismaService.location, 'findUnique')
        .mockResolvedValueOnce(mockLocation as any)
        .mockResolvedValueOnce(null);

      await expect(service.update(1, updateLocationDto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando tenta ser pai de si mesma', async () => {
      const updateLocationDto: UpdateLocationDto = {
        parentId: 1,
      };

      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(mockLocation as any);

      await expect(service.update(1, updateLocationDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deve desativar localização', async () => {
      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(mockLocation as any);
      jest.spyOn(prismaService.location, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.location, 'update').mockResolvedValue({
        ...mockLocation,
        active: false,
      } as any);

      await service.remove(1);

      expect(prismaService.location.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando possui filhos', async () => {
      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(mockLocation as any);
      jest.spyOn(prismaService.location, 'count').mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('mapToResponseDto', () => {
    it('deve mapear todos os campos corretamente', async () => {
      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(mockLocation as any);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Test Location');
      expect(result).toHaveProperty('latitude', -23.5505);
      expect(result).toHaveProperty('longitude', -46.6333);
    });

    it('deve converter latitude/longitude para Number', async () => {
      const locationWithDecimal = {
        ...mockLocation,
        latitude: '-23.5505',
        longitude: '-46.6333',
      };

      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(locationWithDecimal as any);

      const result = await service.findOne(1);

      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');
    });
  });
});

