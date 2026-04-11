import { Test, TestingModule } from '@nestjs/testing';
import { TrackCyclesService } from './track-cycles.service';
import { AuthzService } from '../authz/authz.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { track_cycle_status_enum } from '@prisma/client';

describe('TrackCyclesService', () => {
  let service: TrackCyclesService;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let authz: { isAdmin: jest.Mock; hasAnyRole: jest.Mock; getManagedContextIds: jest.Mock; getParticipantContextIds: jest.Mock };

  const prismaMock = {
    track: {
      findUnique: jest.fn(),
    },
    context: {
      findUnique: jest.fn(),
    },
    section: {
      findMany: jest.fn(),
    },
    sequence: {
      findMany: jest.fn(),
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
    track_cycle_section_schedule: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    track_cycle_sequence_schedule: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackCyclesService,
        {
          provide: AuthzService,
          useValue: {
            isAdmin: jest.fn().mockResolvedValue(false),
            hasAnyRole: jest.fn().mockResolvedValue(true),
            getManagedContextIds: jest.fn().mockResolvedValue([1]),
            getParticipantContextIds: jest.fn().mockResolvedValue([1]),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    moduleRef = module;
    service = module.get<TrackCyclesService>(TrackCyclesService);
    prisma = module.get<PrismaService>(PrismaService);
    authz = module.get(AuthzService) as any;
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

    it('throws if context not found', async () => {
      (prisma.track.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.context.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({
          startDate: '2025-01-01',
          endDate: '2025-01-10',
          trackId: 1,
          contextId: 99,
        } as any),
      ).rejects.toThrow('Contexto com ID 99 não encontrado');
    });

    it('throws ConflictException if cycle with same name exists for track/context', async () => {
      (prisma.track.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.context.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.track_cycle.findFirst as jest.Mock).mockResolvedValue({ id: 1 });

      await expect(
        service.create({
          name: 'Existing',
          trackId: 1,
          contextId: 1,
          startDate: '2025-01-01',
          endDate: '2025-01-10',
        } as any),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create({
          name: 'Existing',
          trackId: 1,
          contextId: 1,
          startDate: '2025-01-01',
          endDate: '2025-01-10',
        } as any),
      ).rejects.toThrow(/Já existe um ciclo com o nome/);
    });

    it('throws ConflictException if mandatorySlug already taken', async () => {
      (prisma.track.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.context.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.track_cycle.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 5 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 5 });

      await expect(
        service.create({
          name: 'Cycle',
          trackId: 1,
          contextId: 1,
          startDate: '2025-01-01',
          endDate: '2025-01-10',
          mandatorySlug: 'slug-ocupado',
        } as any),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create({
          name: 'Cycle',
          trackId: 1,
          contextId: 1,
          startDate: '2025-01-01',
          endDate: '2025-01-10',
          mandatorySlug: 'slug-ocupado',
        } as any),
      ).rejects.toThrow(/slug obrigatório/);
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

    it('creates cycle with mandatorySlug when slug is free', async () => {
      (prisma.track.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.context.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.track_cycle.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (prisma.track_cycle.create as jest.Mock).mockResolvedValue({
        id: 1,
        mandatory_slug: 'formacao-inicial',
      });

      const result = await service.create({
        name: 'Cycle',
        trackId: 1,
        contextId: 1,
        startDate: '2025-01-01',
        endDate: '2025-01-10',
        mandatorySlug: 'formacao-inicial',
      } as any);

      expect(prisma.track_cycle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mandatory_slug: 'formacao-inicial',
          }),
        }),
      );
      expect(result.mandatory_slug).toBe('formacao-inicial');
    });

    it('throws Conflict when mandatorySlug is already taken on create', async () => {
      (prisma.track.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.context.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.track_cycle.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 99 });

      await expect(
        service.create({
          name: 'Cycle',
          trackId: 1,
          contextId: 1,
          startDate: '2025-01-01',
          endDate: '2025-01-10',
          mandatorySlug: 'formacao-inicial',
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  it('findAll()', async () => {
    (prisma.track_cycle.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.findAll({} as any, 1);

    expect(result).toEqual([]);
  });

  it('findAll() retorna [] quando não-admin e sem contextos permitidos', async () => {
    (authz.getManagedContextIds as jest.Mock).mockResolvedValue([]);
    (authz.getParticipantContextIds as jest.Mock).mockResolvedValue([]);

    const result = await service.findAll({} as any, 1);

    expect(result).toEqual([]);
    expect(prisma.track_cycle.findMany).not.toHaveBeenCalled();
  });

  it('findAll() lança ForbiddenException quando não-admin filtra por contexto sem acesso', async () => {
    (authz.getManagedContextIds as jest.Mock).mockResolvedValue([1]);
    (authz.getParticipantContextIds as jest.Mock).mockResolvedValue([1]);

    await expect(service.findAll({ contextId: 99 } as any, 1)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('findOne() lança ForbiddenException quando não-admin sem acesso de leitura ao ciclo', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      context_id: 5,
      track: {},
      context: {},
    });
    (authz.isAdmin as jest.Mock).mockResolvedValue(false);
    (authz.hasAnyRole as jest.Mock).mockResolvedValue(false);

    await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
  });

  it('update() lança ForbiddenException quando não-admin sem permissão de gerenciar', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      track_id: 1,
      context_id: 5,
      name: 'Old',
    });
    (authz.isAdmin as jest.Mock).mockResolvedValue(false);
    (authz.hasAnyRole as jest.Mock).mockResolvedValue(false);

    await expect(service.update(1, {}, 1)).rejects.toThrow(ForbiddenException);
  });

  it('findOne() throws if not found', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne(1, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findActive()', async () => {
    (prisma.track_cycle.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.findActive();

    expect(result).toEqual([]);
  });

  it('update() throws if not found', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.update(1, {}, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update() lança BadRequestException quando endDate < startDate', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      track_id: 1,
      context_id: 1,
      name: 'Old',
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-01-10'),
    });

    await expect(
      service.update(
        1,
        { startDate: '2025-01-10', endDate: '2025-01-01' },
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('update() lança ConflictException quando novo nome já existe no mesmo track/contexto', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      track_id: 1,
      context_id: 1,
      name: 'Old',
    });
    (prisma.track_cycle.findFirst as jest.Mock).mockResolvedValue({ id: 2 });

    await expect(
      service.update(1, { name: 'Existing Name' }, 1),
    ).rejects.toThrow(ConflictException);
  });

  it('update() with mandatorySlug when slug is free', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      track_id: 1,
      context_id: 1,
      name: 'Old',
    });
    (prisma.track_cycle.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.track_cycle.update as jest.Mock).mockResolvedValue({
      id: 1,
      mandatory_slug: 'boas-vidas',
    });

    await service.update(1, { mandatorySlug: 'boas-vidas' }, 1);

    expect(prisma.track_cycle.update).toHaveBeenCalled();
    const updateCall = (prisma.track_cycle.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.mandatory_slug).toBe('boas-vidas');
  });

  it('update() throws Conflict when mandatorySlug is already taken', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      track_id: 1,
      context_id: 1,
      name: 'Old',
    });
    (prisma.track_cycle.findFirst as jest.Mock).mockResolvedValue({ id: 2 });

    await expect(
      service.update(1, { mandatorySlug: 'formacao-inicial' }, 1),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updateStatus() conflicts when another active exists', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      track_id: 1,
      context_id: 1,
    });

    (prisma.track_cycle.findFirst as jest.Mock).mockResolvedValue({ id: 2 });

    await expect(
      service.updateStatus(1, { status: track_cycle_status_enum.active }, 1),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('remove() throws if progress exists', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      track_progress: [{ id: 1 }],
    });

    await expect(service.remove(1, 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('getStudentsProgress()', async () => {
    (prisma.track_cycle.findUnique as jest.Mock).mockResolvedValue({ id: 1 });

    (prisma.track_progress.findMany as jest.Mock).mockResolvedValue([
      { progress_percentage: 50 },
    ]);

    const result = await service.getStudentsProgress(1, 1);

    expect(result[0].progress_percentage).toBe(50);
  });

  describe('replaceSchedules()', () => {
    const cycleRow = {
      id: 1,
      track_id: 5,
      context_id: 1,
      start_date: new Date('2026-01-01T00:00:00.000Z'),
      end_date: new Date('2026-12-31T00:00:00.000Z'),
    };

    const fullCycleResponse = {
      ...cycleRow,
      track: { section: [] },
      context: { id: 1, name: 'Ctx' },
      track_cycle_section_schedule: [],
      track_cycle_sequence_schedule: [],
    };

    beforeEach(() => {
      (authz.isAdmin as jest.Mock).mockResolvedValue(true);
      (prisma.track_cycle.findUnique as jest.Mock)
        .mockResolvedValueOnce(cycleRow)
        .mockResolvedValueOnce(fullCycleResponse);
      (prisma.section.findMany as jest.Mock).mockResolvedValue([
        { id: 10, track_id: 5 },
      ]);
      (prisma.sequence.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: any) => unknown) =>
        fn({
          track_cycle_section_schedule: prisma.track_cycle_section_schedule,
          track_cycle_sequence_schedule: prisma.track_cycle_sequence_schedule,
        }),
      );
      (prisma.track_cycle_section_schedule.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prisma.track_cycle_sequence_schedule.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prisma.track_cycle_section_schedule.createMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
    });

    it('persiste override de seção válido', async () => {
      const result = await service.replaceSchedules(
        1,
        {
          sectionSchedules: [
            { sectionId: 10, startDate: '2026-03-01', endDate: '2026-03-31' },
          ],
          sequenceSchedules: [],
        },
        1,
      );

      expect(prisma.track_cycle_section_schedule.createMany).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 1 });
    });

    it('rejeita seção que não pertence à trilha do ciclo', async () => {
      (prisma.section.findMany as jest.Mock).mockResolvedValue([
        { id: 99, track_id: 1 },
      ]);

      await expect(
        service.replaceSchedules(
          1,
          {
            sectionSchedules: [{ sectionId: 10, startDate: '2026-03-01', endDate: null }],
            sequenceSchedules: [],
          },
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
