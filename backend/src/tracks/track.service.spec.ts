import { Test, TestingModule } from '@nestjs/testing';
import { TrackService } from './track.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

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
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    sequence: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockUser = { id: 1 };

  const mockManagedContexts = [
    {
      context: {
        id: 1,
        active: true,
      },
    },
  ];

  const mockTrack = {
    id: 1,
    name: 'Track Teste',
    active: true,
    section: [],
  };

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

  /* ---------------- CREATE ---------------- */

  describe('create', () => {
    it('deve criar uma track', async () => {
      prismaMock.context_manager.findMany.mockResolvedValue(
        mockManagedContexts,
      );
      prismaMock.track.create.mockResolvedValue(mockTrack);

      const result = await service.create({ name: 'Track Teste' }, mockUser);

      expect(result).toEqual(mockTrack);
      expect(prismaMock.track.create).toHaveBeenCalled();
    });

    it('deve lidar com datas vazias', async () => {
      prismaMock.context_manager.findMany.mockResolvedValue(
        mockManagedContexts,
      );
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

    it('deve lançar BadRequestException quando context_id não for informado e usuário não gerencia nenhum contexto', async () => {
      prismaMock.context_manager.findMany.mockResolvedValue([]);

      await expect(
        service.create({ name: 'Track Teste' }, { userId: mockUser.id }),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.track.create).not.toHaveBeenCalled();
    });
  });

  /* ---------------- LIST ---------------- */

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

  /* ---------------- GET ---------------- */

  describe('get', () => {
    it('deve retornar uma track por id', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);

      const result = await service.get(1);

      expect(result).toEqual(mockTrack);
    });

    it('deve retornar null se não existir', async () => {
      prismaMock.track.findUnique.mockResolvedValue(null);

      const result = await service.get(999);

      expect(result).toBeNull();
    });
  });

  /* ---------------- DELETE ---------------- */

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

  /* ---------------- UPDATE ---------------- */

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

  /* ---------------- REMOVE SEQUENCE ---------------- */

  describe('removeSequence', () => {
    it('deve remover e reordenar sequences', async () => {
      prismaMock.sequence.findUnique.mockResolvedValue({
        id: 1,
        section_id: 1,
        order: 0,
      });

      prismaMock.sequence.findMany.mockResolvedValue([
        { id: 2, section_id: 1, order: 1 },
      ]);

      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.sequence.update.mockResolvedValue({});
      prismaMock.sequence.delete.mockResolvedValue({});

      await service.removeSequence(1, 1, 1);

      expect(prismaMock.sequence.delete).toHaveBeenCalled();
      expect(prismaMock.sequence.update).toHaveBeenCalled();
    });

    it('deve lançar erro se sequence não existir', async () => {
      prismaMock.sequence.findUnique.mockResolvedValue(null);

      await expect(service.removeSequence(1, 1, 999)).rejects.toThrow(
        'Sequence not found',
      );
    });
  });

  /* ---------------- REORDER ---------------- */

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
