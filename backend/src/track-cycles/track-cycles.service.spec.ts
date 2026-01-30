import { Test, TestingModule } from '@nestjs/testing';
import { TrackCyclesService } from './track-cycles.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { track_cycle_status_enum } from '@prisma/client';

describe('TrackCyclesService', () => {
  let service: TrackCyclesService;
  let prisma: PrismaService;

  const prismaMock = {
    track: {
      findUnique: jest.fn(),
    },
    context: {
      findUnique: jest.fn(),
    },
    track_cycle: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    track_progress: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackCyclesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<TrackCyclesService>(TrackCyclesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('throws if endDate < startDate', async () => {
      await expect(
        service.create({
          startDate: '2025-01-10',
          endDate: '2025-01-01',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws if track not found', async () => {
      (prisma.track.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({
          startDate: '2025-01-01',
          endDate: '2025-01-10',
          trackId: 1,
          contextId: 1,
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates cycle successfully', async () => {
      (prisma.track.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.context.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.track_cycle.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.track_cycle.create as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await service.create({
        name: 'Cycle',
        trackId: 1,
        contextId: 1,
        startDate: '2025-01-01',
        endDate: '2025-01-10',
      } as any);

      expect(result).toEqual({ id: 1 });
      expect(prisma.track_cycle.create).toHaveBeenCalled();
    });
  });

  it('findAll()', async () => {
    (prisma.track_cycle.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.findAll({} as any);

    expect(result).toEqual([]);
  });

  it('findOne() throws if not found', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findActive()', async () => {
    (prisma.track_cycle.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.findActive();

    expect(result).toEqual([]);
  });

  it('update() throws if not found', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.update(1, {} as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updateStatus() conflicts when another active exists', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      track_id: 1,
      context_id: 1,
    });

    (prisma.track_cycle.findFirst as jest.Mock).mockResolvedValue({ id: 2 });

    await expect(
      service.updateStatus(1, { status: track_cycle_status_enum.active }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('remove() throws if progress exists', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      track_progress: [{ id: 1 }],
    });

    await expect(service.remove(1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('getStudentsProgress()', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue({ id: 1 });

    (prisma.track_progress.findMany as jest.Mock).mockResolvedValue([
      { progress_percentage: 50 },
    ]);

    const result = await service.getStudentsProgress(1);

    expect(result[0].progress_percentage).toBe(50);
  });
});
