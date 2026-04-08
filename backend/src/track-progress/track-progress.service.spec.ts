import { Test, TestingModule } from '@nestjs/testing';
import { TrackProgressService } from './track-progress.service';
import { PrismaService } from '../prisma/prisma.service';
import { progress_status_enum } from '@prisma/client';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BusinessMetricsService } from '../telemetry/business-metrics.service';

describe('TrackProgressService', () => {
  let service: TrackProgressService;

  const prismaMock = {
    participation: { findUnique: jest.fn(), findFirst: jest.fn() },
    track_cycle: { findUnique: jest.fn(), findMany: jest.fn() },
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
      createMany: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    sequence: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    quiz_submission: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackProgressService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: BusinessMetricsService,
          useValue: { recordTrackProgressStarted: jest.fn() },
        },
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

  it('startTrackProgress – cria sequence_progress quando track tem sequências', async () => {
    prismaMock.participation.findUnique.mockResolvedValue({
      id: 1,
      context_id: 1,
    });

    prismaMock.track_cycle.findUnique.mockResolvedValue({
      id: 1,
      context_id: 1,
      track: {
        section: [
          {
            id: 1,
            sequence: [
              { id: 10, section_id: 1 },
              { id: 11, section_id: 1 },
            ],
          },
        ],
      },
    });

    prismaMock.track_progress.findUnique.mockResolvedValue(null);
    prismaMock.track_progress.create.mockResolvedValue({
      id: 1,
      progress_percentage: 0,
      participation_id: 1,
      track_cycle_id: 1,
    });
    prismaMock.sequence_progress.createMany.mockResolvedValue({ count: 2 });

    const result = await service.startTrackProgress({
      participationId: 1,
      trackCycleId: 1,
    } as any);

    expect(result.id).toBe(1);
    expect(prismaMock.sequence_progress.createMany).toHaveBeenCalledWith({
      data: [
        {
          track_progress_id: 1,
          sequence_id: 10,
          status: progress_status_enum.not_started,
          visits_count: 0,
        },
        {
          track_progress_id: 1,
          sequence_id: 11,
          status: progress_status_enum.not_started,
          visits_count: 0,
        },
      ],
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

  it('startTrackProgress – participação não pertence ao contexto do ciclo', async () => {
    prismaMock.participation.findUnique.mockResolvedValue({
      id: 1,
      context_id: 1,
    });

    prismaMock.track_cycle.findUnique.mockResolvedValue({
      id: 1,
      context_id: 2,
      track: { section: [] },
    });

    await expect(
      service.startTrackProgress({
        participationId: 1,
        trackCycleId: 1,
      } as any),
    ).rejects.toThrow('A participação não pertence ao contexto do ciclo');
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

  it('updateSequenceProgress – sequência não encontrada', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue({
      id: 1,
      track_cycle_id: 1,
    });
    prismaMock.sequence.findUnique.mockResolvedValue(null);

    await expect(
      service.updateSequenceProgress(1, 999, {} as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('updateSequenceProgress – sequência inativa', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue({
      id: 1,
      track_cycle_id: 1,
    });
    prismaMock.sequence.findUnique.mockResolvedValue({
      id: 1,
      active: false,
    });

    await expect(
      service.updateSequenceProgress(1, 1, {} as any),
    ).rejects.toThrow(BadRequestException);
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

  it('canAccessSequence – sequência não encontrada', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.sequence.findUnique.mockResolvedValue(null);

    const result = await service.canAccessSequence(1, 1, 999);
    expect(result.canAccess).toBe(false);
    expect(result.reason).toBe('Sequência não encontrada');
  });

  it('canAccessSequence – atividade anterior não concluída', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue({
      id: 1,
      sequence_progress: [],
      track_cycle: { track: { section: [] } },
    });
    prismaMock.sequence.findUnique.mockResolvedValue({
      id: 2,
      section_id: 1,
      order: 2,
      section: { track: {} },
    });
    prismaMock.sequence.findFirst.mockResolvedValue({
      id: 1,
      section_id: 1,
      order: 1,
      active: true,
    });
    prismaMock.sequence_progress.findUnique.mockResolvedValue({
      id: 1,
      status: progress_status_enum.in_progress,
    });

    const result = await service.canAccessSequence(1, 1, 2);
    expect(result.canAccess).toBe(false);
    expect(result.reason).toMatch(/completar a atividade anterior/);
  });

  it('findAll', async () => {
    prismaMock.track_progress.findMany.mockResolvedValue([]);
    const result = await service.findAll({});
    expect(result).toEqual([]);
  });

  it('recalculateTrackProgress – ciclo não encontrado', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue(null);

    await expect(service.recalculateTrackProgress(1)).rejects.toThrow();
  });

  it('recalculateTrackProgress – sem sequências ativas', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue({
      id: 1,
      sequence_progress: [],
      track_cycle: {
        track: {
          section: [
            {
              sequence: [],
            },
          ],
        },
      },
    });

    const result = await service.recalculateTrackProgress(1);
    expect(result).toHaveProperty('progress_percentage');
  });

  it('recalculateTrackProgress – com sequências completas e incompletas', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue({
      id: 1,
      status: progress_status_enum.in_progress,
      completed_at: null,
      sequence_progress: [
        { sequence_id: 1, status: progress_status_enum.completed },
        { sequence_id: 2, status: progress_status_enum.in_progress },
      ],
      track_cycle: {
        track: {
          section: [
            {
              sequence: [
                { id: 1, active: true },
                { id: 2, active: true },
                { id: 3, active: true },
              ],
            },
          ],
        },
      },
    });

    prismaMock.track_progress.update.mockResolvedValue({
      id: 1,
      progress_percentage: 33.33,
      status: progress_status_enum.in_progress,
      completed_at: null,
    });

    const result = await service.recalculateTrackProgress(1);
    expect(prismaMock.track_progress.update).toHaveBeenCalled();
    expect(result.progress_percentage).toBeCloseTo(33.33);
  });

  it('recalculateTrackProgress – 100% completo define status completed e completed_at', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue({
      id: 1,
      status: progress_status_enum.in_progress,
      completed_at: null,
      sequence_progress: [
        { sequence_id: 1, status: progress_status_enum.completed },
        { sequence_id: 2, status: progress_status_enum.completed },
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

    prismaMock.track_progress.update.mockResolvedValue({
      id: 1,
      progress_percentage: 100,
      status: progress_status_enum.completed,
      completed_at: new Date(),
    });

    const result = await service.recalculateTrackProgress(1);
    expect(prismaMock.track_progress.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: progress_status_enum.completed,
        progress_percentage: 100,
      }),
    });
    expect(result.progress_percentage).toBe(100);
  });

  it('completeContentSequence – erro se for quiz', async () => {
    prismaMock.sequence.findUnique.mockResolvedValue({
      id: 1,
      form_id: 123, // É quiz
    });

    await expect(service.completeContentSequence(1, 1)).rejects.toThrow(
      'Esta sequência é um quiz e deve ser completada através de submissão',
    );
  });

  it('completeContentSequence – sucesso', async () => {
    prismaMock.sequence.findUnique.mockResolvedValue({
      id: 1,
      form_id: null, // Conteúdo
    });

    jest.spyOn(service, 'updateSequenceProgress').mockResolvedValue({
      id: 1,
      status: progress_status_enum.completed,
    } as any);

    const result = await service.completeContentSequence(1, 1);

    expect(result.status).toBe(progress_status_enum.completed);
  });

  it('completeQuizSequence – erro se não for quiz', async () => {
    prismaMock.sequence.findUnique.mockResolvedValue({
      id: 1,
      form_id: null, // não é quiz
    });

    await expect(service.completeQuizSequence(1, 1, 99)).rejects.toThrow(
      'Esta sequência não é um quiz',
    );
  });

  it('completeQuizSequence – sucesso', async () => {
    prismaMock.sequence.findUnique.mockResolvedValue({
      id: 1,
      form_id: 10, // quiz
    });

    prismaMock.quiz_submission.findUnique.mockResolvedValue({
      id: 99,
      is_passed: true,
    });

    prismaMock.sequence_progress.findUnique.mockResolvedValue(null);
    prismaMock.sequence_progress.create.mockResolvedValue({ id: 5 });
    jest.spyOn(service, 'updateSequenceProgress').mockResolvedValue({
      id: 5,
      status: progress_status_enum.completed,
    } as any);

    const result = await service.completeQuizSequence(1, 1, 99);
    expect(result.status).toBe(progress_status_enum.completed);
  });

  it('completeQuizSequence – erro quiz reprovado', async () => {
    prismaMock.sequence.findUnique.mockResolvedValue({
      id: 1,
      form_id: 10, // quiz
    });

    prismaMock.quiz_submission.findUnique.mockResolvedValue({
      id: 99,
      is_passed: false,
    });

    await expect(service.completeQuizSequence(1, 1, 99)).rejects.toThrow(
      'Quiz não foi aprovado',
    );
  });

  it('findByUserAndCycle – bloqueia sequência', async () => {
    prismaMock.track_progress.findUnique.mockResolvedValue({
      id: 1,
      progress_percentage: 0,
      track_cycle: {
        track: {
          section: [
            {
              order: 1,
              sequence: [
                { id: 1, order: 1, active: true },
                { id: 2, order: 2, active: true },
              ],
            },
          ],
        },
      },
      sequence_progress: [
        { sequence_id: 1, status: progress_status_enum.in_progress },
        { sequence_id: 2, status: progress_status_enum.not_started },
      ],
    });

    const result = await service.findByUserAndCycle(1, 1);

    expect(result.sequence_locked[1]).toBe(false);
    expect(result.sequence_locked[2]).toBe(true);
  });

  it('findExecutions – filtra e retorna', async () => {
    prismaMock.sequence_progress.findMany.mockResolvedValue([
      {
        id: 1,
        completed_at: new Date(),
        track_progress: {
          id: 10,
          track_cycle_id: 20,
          track_cycle: { name: 'Cycle 1' },
          participation_id: 100,
          participation: { user: { name: 'User1' } },
        },
        sequence: {
          form_id: null,
          content: { title: 'Content title' },
          form: null,
          content_id: 500,
        },
      },
    ]);

    const result = await service.findExecutions({});

    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty('activityName', 'Content title');
  });

  it('findCompletedByUser', async () => {
    prismaMock.track_progress.findMany.mockResolvedValue([]);
    const result = await service.findCompletedByUser(1);
    expect(result).toEqual([]);
  });

  describe('getMandatoryCompliance', () => {
    it('throws NotFound when participation does not exist', async () => {
      prismaMock.participation.findUnique.mockResolvedValue(null);

      await expect(
        service.getMandatoryCompliance(999, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws Forbidden when participation belongs to another user', async () => {
      prismaMock.participation.findUnique.mockResolvedValue({
        id: 1,
        user_id: 2,
        context_id: 10,
        context: {},
      });

      await expect(
        service.getMandatoryCompliance(1, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns empty items when no mandatory cycles in context', async () => {
      prismaMock.participation.findUnique.mockResolvedValue({
        id: 1,
        user_id: 1,
        context_id: 10,
        context: {},
      });
      prismaMock.track_cycle.findMany.mockResolvedValue([]);

      const result = await service.getMandatoryCompliance(1, 1);

      expect(result).toEqual({
        items: [],
        totalRequired: 0,
        completedCount: 0,
      });
    });

    it('returns items with completed false when no progress completed', async () => {
      prismaMock.participation.findUnique.mockResolvedValue({
        id: 1,
        user_id: 1,
        context_id: 10,
        context: {},
      });
      prismaMock.track_cycle.findMany.mockResolvedValue([
        {
          id: 5,
          mandatory_slug: 'formacao-inicial',
          name: '2026.1',
          track: { name: 'Trilha Formação' },
        },
      ]);
      prismaMock.track_progress.findMany.mockResolvedValue([]);

      const result = await service.getMandatoryCompliance(1, 1);

      expect(result.totalRequired).toBe(1);
      expect(result.completedCount).toBe(0);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        mandatorySlug: 'formacao-inicial',
        label: 'Trilha Formação – 2026.1',
        completed: false,
        trackCycleId: 5,
      });
    });

    it('returns items with completed true when progress exists', async () => {
      prismaMock.participation.findUnique.mockResolvedValue({
        id: 1,
        user_id: 1,
        context_id: 10,
        context: {},
      });
      prismaMock.track_cycle.findMany.mockResolvedValue([
        {
          id: 5,
          mandatory_slug: 'formacao-inicial',
          name: '2026.1',
          track: { name: 'Trilha Formação' },
        },
      ]);
      prismaMock.track_progress.findMany.mockResolvedValue([
        { track_cycle: { mandatory_slug: 'formacao-inicial' } },
      ]);

      const result = await service.getMandatoryCompliance(1, 1);

      expect(result.totalRequired).toBe(1);
      expect(result.completedCount).toBe(1);
      expect(result.items[0].completed).toBe(true);
    });
  });
});
