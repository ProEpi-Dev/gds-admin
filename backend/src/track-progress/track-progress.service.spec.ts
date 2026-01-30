import { Test, TestingModule } from '@nestjs/testing';
import { TrackProgressService } from './track-progress.service';
import { PrismaService } from '../prisma/prisma.service';
import { progress_status_enum } from '@prisma/client';

describe('TrackProgressService', () => {
  let service: TrackProgressService;

  const prismaMock = {
    participation: { findUnique: jest.fn() },
    track_cycle: { findUnique: jest.fn() },
    track_progress: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    sequence_progress: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    sequence: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    quiz_submission: { update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackProgressService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(TrackProgressService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('startTrackProgress – sucesso', async () => {
    prismaMock.participation.findUnique.mockResolvedValue({
      id: 1,
      context_id: 1,
    });

    prismaMock.track_cycle.findUnique.mockResolvedValue({
      id: 1,
      context_id: 1,
      track: { section: [] },
    });

    prismaMock.track_progress.findUnique.mockResolvedValue(null);
    prismaMock.track_progress.create.mockResolvedValue({
      id: 1,
      progress_percentage: 0,
    });

    const result = await service.startTrackProgress({
      participationId: 1,
      trackCycleId: 1,
    } as any);

    expect(result).toMatchObject({
      id: 1,
      progress_percentage: 0,
    });
  });

  it('startTrackProgress – participação não encontrada', async () => {
    prismaMock.participation.findUnique.mockResolvedValue(null);

    await expect(
      service.startTrackProgress({
        participationId: 1,
        trackCycleId: 1,
      } as any),
    ).rejects.toThrow();
  });

  it('startTrackProgress – track cycle não encontrado', async () => {
    prismaMock.participation.findUnique.mockResolvedValue({
      id: 1,
      context_id: 1,
    });

    prismaMock.track_cycle.findUnique.mockResolvedValue(null);

    await expect(
      service.startTrackProgress({
        participationId: 1,
        trackCycleId: 1,
      } as any),
    ).rejects.toThrow();
  });

  it('startTrackProgress – progresso já existe', async () => {
    prismaMock.participation.findUnique.mockResolvedValue({
      id: 1,
      context_id: 1,
    });

    prismaMock.track_cycle.findUnique.mockResolvedValue({
      id: 1,
      context_id: 1,
      track: { section: [] },
    });

    prismaMock.track_progress.findUnique.mockResolvedValue({ id: 99 });

    await expect(
      service.startTrackProgress({
        participationId: 1,
        trackCycleId: 1,
      } as any),
    ).rejects.toThrow();
  });

  it('updateSequenceProgress – sequência já existe, deve atualizar', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue({
      id: 1,
      status: progress_status_enum.in_progress,
      sequence_progress: [
        {
          id: 1,
          status: progress_status_enum.in_progress,
          visits_count: 0,
          sequence_id: 1,
        },
      ],
      track_cycle: {
        track: {
          section: [
            {
              sequence: [{ id: 1, active: true }],
            },
          ],
        },
      },
    });

    prismaMock.sequence.findUnique.mockResolvedValue({ id: 1, active: true });
    prismaMock.sequence_progress.findUnique.mockResolvedValue({
      id: 1,
      status: progress_status_enum.in_progress,
      visits_count: 0,
    });

    prismaMock.sequence_progress.update.mockResolvedValue({ id: 1 });
    prismaMock.track_progress.update.mockResolvedValue({ id: 1 });

    await service.updateSequenceProgress(1, 1, { progress: 50 } as any);

    expect(prismaMock.sequence_progress.update).toHaveBeenCalled();
    expect(prismaMock.track_progress.update).toHaveBeenCalled();
  });

  it('canAccessSequence – pode acessar', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue({
      id: 1,
      status: progress_status_enum.in_progress,
      sequence_progress: [
        { id: 1, status: progress_status_enum.completed, sequence_id: 1 },
      ],
      track_cycle: {
        track: {
          section: [
            {
              sequence: [
                { id: 1, active: true },
                { id: 2, active: true },
              ],
            },
          ],
        },
      },
    } as any);

    prismaMock.sequence.findUnique.mockResolvedValue({ id: 2, active: true });

    const result = await service.canAccessSequence(1, 1, 2);

    expect(result.canAccess).toBe(true);
  });

  it('findAll – retorna lista de progressos', async () => {
    const mockData = [
      { id: 1, progress_percentage: 50 },
      { id: 2, progress_percentage: 100 },
    ];
    prismaMock.track_progress.findMany.mockResolvedValue(mockData);

    const result = await service.findAll({});

    expect(result).toEqual(mockData);
  });

  it('findCompletedByUser – retorna lista de progressos completos', async () => {
    const mockData = [{ id: 1, progress_percentage: 100 }];
    prismaMock.track_progress.findMany.mockResolvedValue(mockData);

    const result = await service.findCompletedByUser(1);

    expect(result).toEqual(mockData);
  });

  it('updateSequenceProgress – progresso não encontrado', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue(null);

    await expect(
      service.updateSequenceProgress(1, 2, {} as any),
    ).rejects.toThrow();
  });

  it('updateSequenceProgress – sucesso', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue({
      id: 1,
      status: progress_status_enum.in_progress,
      sequence_progress: [
        { id: 1, status: progress_status_enum.completed },
        { id: 2, status: progress_status_enum.in_progress },
      ],
      track_cycle: {
        track: {
          section: [
            {
              sequence: [
                { id: 1, active: true },
                { id: 2, active: true },
              ],
            },
          ],
        },
      },
    });

    prismaMock.sequence.findUnique.mockResolvedValue({ id: 1, active: true });
    prismaMock.sequence_progress.findUnique.mockResolvedValue(null);
    prismaMock.sequence_progress.create.mockResolvedValue({ id: 1 });
    prismaMock.track_progress.update.mockResolvedValue({ id: 1 });

    await service.updateSequenceProgress(1, 1, { progress: 100 } as any);

    expect(prismaMock.sequence_progress.create).toHaveBeenCalled();
    expect(prismaMock.track_progress.update).toHaveBeenCalled();
  });

  it('canAccessSequence – sem progresso', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue(null);

    const result = await service.canAccessSequence(1, 1, 1);
    expect(result.canAccess).toBe(false);
  });

  it('findAll', async () => {
    prismaMock.track_progress.findMany.mockResolvedValue([]);
    const result = await service.findAll({});
    expect(result).toEqual([]);
  });

  it('findCompletedByUser', async () => {
    prismaMock.track_progress.findMany.mockResolvedValue([]);
    const result = await service.findCompletedByUser(1);
    expect(result).toEqual([]);
  });
});
