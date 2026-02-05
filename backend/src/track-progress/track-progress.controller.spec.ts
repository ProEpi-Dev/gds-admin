import { Test, TestingModule } from '@nestjs/testing';
import { TrackProgressController } from './track-progress.controller';
import { TrackProgressService } from './track-progress.service';

describe('TrackProgressController', () => {
  let controller: TrackProgressController;
  let service: TrackProgressService;

  const mockService = {
    startTrackProgress: jest.fn(),
    findAll: jest.fn(),
    getMandatoryCompliance: jest.fn(),
    findCompletedByUser: jest.fn(),
    findExecutions: jest.fn(),
    findByUserAndCycle: jest.fn(),
    canAccessSequence: jest.fn(),
    updateSequenceProgress: jest.fn(),
    completeContentSequence: jest.fn(),
    completeQuizSequence: jest.fn(),
    recalculateTrackProgress: jest.fn(),
  };

  const mockUser = { id: 1, userId: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackProgressController],
      providers: [
        {
          provide: TrackProgressService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get(TrackProgressController);
    service = module.get(TrackProgressService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('start', async () => {
    mockService.startTrackProgress.mockResolvedValue({ id: 1 });
    const result = await controller.start({
      participationId: 1,
      trackCycleId: 1,
    } as any);
    expect(result).toEqual({ id: 1 });
  });

  it('findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    const result = await controller.findAll({});
    expect(result).toEqual([]);
  });

  it('getMyProgress', async () => {
    mockService.findAll.mockResolvedValue(['ok']);
    const result = await controller.getMyProgress(mockUser);
    expect(service.findAll).toHaveBeenCalledWith({ userId: 1 });
    expect(result).toEqual(['ok']);
  });

  it('getHistory', async () => {
    mockService.findCompletedByUser.mockResolvedValue(['done']);
    const result = await controller.getHistory(mockUser);
    expect(result).toEqual(['done']);
  });

  it('getMandatoryCompliance', async () => {
    const compliance = {
      items: [{ mandatorySlug: 'formacao-inicial', label: 'Trilha – 2026.1', completed: false, trackCycleId: 5 }],
      totalRequired: 1,
      completedCount: 0,
    };
    mockService.getMandatoryCompliance.mockResolvedValue(compliance);
    const result = await controller.getMandatoryCompliance(1, mockUser);
    expect(service.getMandatoryCompliance).toHaveBeenCalledWith(1, mockUser.userId);
    expect(result).toEqual(compliance);
  });

  it('getExecutions', async () => {
    mockService.findExecutions.mockResolvedValue([]);
    const result = await controller.getExecutions({});
    expect(result).toEqual([]);
  });

  it('findByUserAndCycle', async () => {
    mockService.findByUserAndCycle.mockResolvedValue({ id: 1 });
    const result = await controller.findByUserAndCycle(1, 2);
    expect(result).toEqual({ id: 1 });
  });

  it('canAccessSequence – progresso não encontrado', async () => {
    mockService.findAll.mockResolvedValue([]);
    const result = await controller.canAccessSequence(1, 2);
    expect(result.canAccess).toBe(false);
  });

  it('updateSequenceProgress', async () => {
    mockService.updateSequenceProgress.mockResolvedValue({ ok: true });
    const result = await controller.updateSequenceProgress(1, 2, {});
    expect(result).toEqual({ ok: true });
  });

  it('completeContent', async () => {
    mockService.completeContentSequence.mockResolvedValue({ ok: true });
    const result = await controller.completeContent(1, 2);
    expect(result).toEqual({ ok: true });
  });

  it('completeQuiz', async () => {
    mockService.completeQuizSequence.mockResolvedValue({ ok: true });
    const result = await controller.completeQuiz(1, 2, {
      quizSubmissionId: 99,
    });
    expect(result).toEqual({ ok: true });
  });

  it('recalculate', async () => {
    mockService.recalculateTrackProgress.mockResolvedValue({ progress: 100 });
    const result = await controller.recalculate(1);
    expect(result).toEqual({ progress: 100 });
  });
});
