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
      createMany: jest.fn(),
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
    });

    prismaMock.sequence.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.sequence_progress.findUnique.mockResolvedValue(null);
    prismaMock.sequence_progress.create.mockResolvedValue({ id: 1 });

    const result = await service.updateSequenceProgress(1, 1, {
      progress: 100,
    } as any);

    expect(result).toBeDefined();
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
