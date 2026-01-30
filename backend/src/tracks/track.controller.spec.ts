import { Test, TestingModule } from '@nestjs/testing';
import { TrackController } from './track.controller';
import { TrackService } from './track.service';

describe('TrackController', () => {
  let controller: TrackController;
  let service: TrackService;

  const mockTrack = {
    id: 1,
    name: 'Track Teste',
    active: true,
    section: [],
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  const mockUser = { id: 1 } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackController],
      providers: [
        {
          provide: TrackService,
          useValue: {
            create: jest.fn(),
            list: jest.fn(),
            get: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TrackController>(TrackController);
    service = module.get<TrackService>(TrackService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('deve criar uma track', async () => {
      const createData = {
        name: 'Nova Track',
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockTrack as any);

      const result = await controller.create(createData, mockUser);

      expect(result).toEqual(mockTrack);
      expect(service.create).toHaveBeenCalledWith(createData, mockUser);
    });
  });

  describe('list', () => {
    it('deve retornar lista de tracks', async () => {
      const mockTracks = [mockTrack];

      jest.spyOn(service, 'list').mockResolvedValue(mockTracks as any);

      const result = await controller.list({});

      expect(result).toEqual(mockTracks);
      expect(service.list).toHaveBeenCalledWith({});
    });
  });

  describe('get', () => {
    it('deve retornar track por id', async () => {
      jest.spyOn(service, 'get').mockResolvedValue(mockTrack as any);

      const result = await controller.get('1');

      expect(result).toEqual(mockTrack);
      expect(service.get).toHaveBeenCalledWith(1);
    });

    it('deve converter string id para number', async () => {
      jest.spyOn(service, 'get').mockResolvedValue(mockTrack as any);

      await controller.get('123');

      expect(service.get).toHaveBeenCalledWith(123);
    });
  });

  describe('update', () => {
    it('deve atualizar uma track', async () => {
      const updateData = {
        name: 'Track Atualizada',
      };

      const updatedTrack = {
        ...mockTrack,
        ...updateData,
      };

      jest.spyOn(service, 'update').mockResolvedValue(updatedTrack as any);

      const result = await controller.update('1', updateData, mockUser);

      expect(result).toEqual(updatedTrack);
      expect(service.update).toHaveBeenCalledWith(1, updateData, mockUser);
    });

    it('deve converter string id para number', async () => {
      jest.spyOn(service, 'update').mockResolvedValue(mockTrack as any);

      await controller.update('456', { name: 'Teste' }, mockUser);

      expect(service.update).toHaveBeenCalledWith(
        456,
        { name: 'Teste' },
        mockUser,
      );
    });
  });

  describe('delete', () => {
    it('deve deletar (soft delete) a track', async () => {
      jest.spyOn(service, 'delete').mockResolvedValue(mockTrack as any);

      const result = await controller.delete('1');

      expect(result).toEqual(mockTrack);
      expect(service.delete).toHaveBeenCalledWith(1);
    });

    it('deve converter string id para number', async () => {
      jest.spyOn(service, 'delete').mockResolvedValue(mockTrack as any);

      await controller.delete('789');

      expect(service.delete).toHaveBeenCalledWith(789);
    });
  });
});
