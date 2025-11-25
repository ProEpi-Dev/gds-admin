import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

describe('LocationsController', () => {
  let controller: LocationsController;
  let locationsService: LocationsService;

  const mockLocation: LocationResponseDto = {
    id: 1,
    name: 'Test Location',
    parentId: null,
    latitude: -23.5505,
    longitude: -46.6333,
    polygons: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockListResponse: ListResponseDto<LocationResponseDto> = {
    data: [mockLocation],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    links: {
      first: '/v1/locations?page=1&pageSize=20',
      last: '/v1/locations?page=1&pageSize=20',
      prev: null,
      next: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        {
          provide: LocationsService,
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

    controller = module.get<LocationsController>(LocationsController);
    locationsService = module.get<LocationsService>(LocationsService);
  });

  describe('create', () => {
    it('deve criar localização com sucesso', async () => {
      const createLocationDto: CreateLocationDto = {
        name: 'Test Location',
        active: true,
      };

      jest.spyOn(locationsService, 'create').mockResolvedValue(mockLocation);

      const result = await controller.create(createLocationDto);

      expect(result).toEqual(mockLocation);
      expect(locationsService.create).toHaveBeenCalledWith(createLocationDto);
    });

    it('deve lançar BadRequestException quando parent não existe', async () => {
      const createLocationDto: CreateLocationDto = {
        name: 'Test Location',
        parentId: 999,
      };

      jest
        .spyOn(locationsService, 'create')
        .mockRejectedValue(new BadRequestException('Localização pai não encontrada'));

      await expect(controller.create(createLocationDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const query: LocationQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(locationsService, 'findAll').mockResolvedValue(mockListResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockListResponse);
      expect(locationsService.findAll).toHaveBeenCalledWith(query);
    });

    it('deve filtrar por active e parentId', async () => {
      const query: LocationQueryDto = {
        page: 1,
        pageSize: 20,
        active: false,
        parentId: 1,
      };

      jest.spyOn(locationsService, 'findAll').mockResolvedValue(mockListResponse);

      await controller.findAll(query);

      expect(locationsService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('deve retornar localização quando existe', async () => {
      jest.spyOn(locationsService, 'findOne').mockResolvedValue(mockLocation);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockLocation);
      expect(locationsService.findOne).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(locationsService, 'findOne')
        .mockRejectedValue(new NotFoundException('Localização não encontrada'));

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar localização com sucesso', async () => {
      const updateLocationDto: UpdateLocationDto = {
        name: 'Updated Location',
      };

      const updatedLocation = { ...mockLocation, name: 'Updated Location' };
      jest.spyOn(locationsService, 'update').mockResolvedValue(updatedLocation);

      const result = await controller.update(1, updateLocationDto);

      expect(result).toEqual(updatedLocation);
      expect(locationsService.update).toHaveBeenCalledWith(1, updateLocationDto);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateLocationDto: UpdateLocationDto = {
        name: 'Updated Location',
      };

      jest
        .spyOn(locationsService, 'update')
        .mockRejectedValue(new NotFoundException('Localização não encontrada'));

      await expect(controller.update(999, updateLocationDto)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando parent não existe', async () => {
      const updateLocationDto: UpdateLocationDto = {
        parentId: 999,
      };

      jest
        .spyOn(locationsService, 'update')
        .mockRejectedValue(new BadRequestException('Localização pai não encontrada'));

      await expect(controller.update(1, updateLocationDto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando tenta ser pai de si mesma', async () => {
      const updateLocationDto: UpdateLocationDto = {
        parentId: 1,
      };

      jest
        .spyOn(locationsService, 'update')
        .mockRejectedValue(new BadRequestException('Uma localização não pode ser pai de si mesma'));

      await expect(controller.update(1, updateLocationDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deve desativar localização', async () => {
      jest.spyOn(locationsService, 'remove').mockResolvedValue(undefined);

      await controller.remove(1);

      expect(locationsService.remove).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(locationsService, 'remove')
        .mockRejectedValue(new NotFoundException('Localização não encontrada'));

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando possui filhos', async () => {
      jest
        .spyOn(locationsService, 'remove')
        .mockRejectedValue(new BadRequestException('Localização possui filhos'));

      await expect(controller.remove(1)).rejects.toThrow(BadRequestException);
    });
  });
});

