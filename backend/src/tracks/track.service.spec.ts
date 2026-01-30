import { Test, TestingModule } from '@nestjs/testing';
import { TrackService } from './track.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TrackService', () => {
  let service: TrackService;

  const prismaMock = {
    context_manager: {
      findMany: jest.fn(),
    },
    track: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    section: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    sequence: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockTrack = {
    id: 1,
    name: 'Track Teste',
    active: true,
    section: [],
  };

  const mockUser = { id: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<TrackService>(TrackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar uma track', async () => {
      prismaMock.context_manager.findMany.mockResolvedValue([
        { context_id: 1 },
      ]);

      prismaMock.track.create.mockResolvedValue(mockTrack);

      const result = await service.create({ name: 'Track Teste' }, mockUser);

      expect(result).toEqual(mockTrack);
      expect(prismaMock.track.create).toHaveBeenCalled();
    });

    it('deve lidar com datas vazias', async () => {
      prismaMock.context_manager.findMany.mockResolvedValue([]);
      prismaMock.track.create.mockResolvedValue(mockTrack);

      await service.create(
        {
          name: 'Track Teste',
          start_date: '',
          end_date: '',
        },
        mockUser,
      );

      expect(prismaMock.track.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            start_date: undefined,
            end_date: undefined,
          }),
        }),
      );
    });
  });

  describe('list', () => {
    it('deve retornar tracks ativas', async () => {
      prismaMock.track.findMany.mockResolvedValue([mockTrack]);

      const result = await service.list();

      expect(result).toEqual([mockTrack]);
      expect(prismaMock.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
        }),
      );
    });
  });

  describe('get', () => {
    it('deve retornar uma track por id', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);

      const result = await service.get(1);

      expect(result).toEqual(mockTrack);
      expect(prismaMock.track.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
        }),
      );
    });

    it('deve retornar null se não existir', async () => {
      prismaMock.track.findUnique.mockResolvedValue(null);

      const result = await service.get(999);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('deve desativar a track', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.track.update.mockResolvedValue({
        ...mockTrack,
        active: false,
      });

      const result = await service.delete(1);

      expect(result.active).toBe(false);
      expect(prismaMock.track.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });
  });

  describe('update', () => {
    it('deve atualizar uma track', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.track.update.mockResolvedValue(mockTrack);

      const result = await service.update(
        1,
        { name: 'Track Atualizada' },
        mockUser,
      );

      expect(result).toEqual(mockTrack);
      expect(prismaMock.track.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Track Atualizada' },
      });
    });

    it('deve lidar com datas vazias no update', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.track.update.mockResolvedValue(mockTrack);

      await service.update(
        1,
        {
          name: 'Track Atualizada',
          start_date: '',
          end_date: '',
        },
        mockUser,
      );

      expect(prismaMock.track.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Track Atualizada',
          start_date: undefined,
          end_date: undefined,
        },
      });
    });
  });

  describe('removeSequence', () => {
    it('deve remover e reordenar sequences', async () => {
      prismaMock.sequence.findUnique.mockResolvedValue({
        id: 1,
        section_id: 1,
        order: 0,
      });

      prismaMock.sequence.delete.mockResolvedValue({});
      prismaMock.sequence.findMany.mockResolvedValue([
        { id: 2, section_id: 1, order: 1 },
      ]);

      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.sequence.update.mockResolvedValue({});

      await service.removeSequence(1, 1, 1);

      expect(prismaMock.sequence.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaMock.sequence.update).toHaveBeenCalled();
    });

    it('deve lançar erro se sequence não existir', async () => {
      prismaMock.sequence.findUnique.mockResolvedValue(null);

      await expect(service.removeSequence(1, 1, 999)).rejects.toThrow(
        'Sequence not found',
      );
    });
  });

  describe('reorderSections', () => {
    it('deve reordenar seções', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.section.update.mockResolvedValue({});

      await service.reorderSections(1, [
        { id: 1, order: 1 },
        { id: 2, order: 0 },
      ]);

      expect(prismaMock.section.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('reorderSequences', () => {
    it('deve reordenar sequences', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.sequence.update.mockResolvedValue({});

      await service.reorderSequences(1, 1, [
        { id: 1, order: 1 },
        { id: 2, order: 0 },
      ]);

      expect(prismaMock.sequence.update).toHaveBeenCalledTimes(2);
    });
  });
});
