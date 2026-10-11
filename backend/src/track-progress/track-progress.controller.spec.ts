import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TrackProgressController } from './track-progress.controller';
import { TrackProgressService } from './track-progress.service';
import { TrackProgressAccessService } from './track-progress-access.service';
import { RolesGuard } from '../authz/guards/roles.guard';

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
    canAccessSequenceForTrackProgress: jest.fn(),
    updateSequenceProgress: jest.fn(),
    completeContentSequence: jest.fn(),
    completeQuizSequence: jest.fn(),
    recalculateTrackProgress: jest.fn(),
  };

  const mockAccess = {
    checkTrackProgress: jest.fn(),
    checkParticipation: jest.fn(),
  };

  /** Alinhado ao payload do JWT (JwtStrategy): apenas userId. */
  const mockUser = { userId: 1 };

  const expectTrackProgressCheck = (
    endpoint: string,
    trackProgressId: number,
  ) =>
    expect(mockAccess.checkTrackProgress).toHaveBeenCalledWith(
      { userId: 1, channel: 'app', endpoint },
      trackProgressId,
    );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackProgressController],
      providers: [
        {
          provide: TrackProgressService,
          useValue: mockService,
        },
        {
          provide: TrackProgressAccessService,
          useValue: mockAccess,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get(TrackProgressController);
    service = module.get(TrackProgressService);
    jest.clearAllMocks();
    mockAccess.checkTrackProgress.mockResolvedValue(undefined);
    mockAccess.checkParticipation.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('start – checa a participação antes de iniciar', async () => {
    mockService.startTrackProgress.mockResolvedValue({ id: 1 });
    const result = await controller.start(
      { participationId: 7, trackCycleId: 1 } as any,
      mockUser,
      'app',
    );
    expect(mockAccess.checkParticipation).toHaveBeenCalledWith(
      { userId: 1, channel: 'app', endpoint: 'start' },
      7,
    );
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
    expect(service.findCompletedByUser).toHaveBeenCalledWith(1);
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

  it('findByUserAndCycle – checa a participação', async () => {
    mockService.findByUserAndCycle.mockResolvedValue({ id: 1 });
    const result = await controller.findByUserAndCycle(3, 2, mockUser, 'app');
    expect(mockAccess.checkParticipation).toHaveBeenCalledWith(
      { userId: 1, channel: 'app', endpoint: 'participation-cycle' },
      3,
    );
    expect(result).toEqual({ id: 1 });
  });

  it('canAccessSequence – progresso não encontrado', async () => {
    mockService.canAccessSequenceForTrackProgress.mockResolvedValue({
      canAccess: false,
      reason: 'Progresso não encontrado',
    });
    const result = await controller.canAccessSequence(1, 2, mockUser, 'app');
    expectTrackProgressCheck('can-access', 1);
    expect(service.canAccessSequenceForTrackProgress).toHaveBeenCalledWith(1, 2);
    expect(result.canAccess).toBe(false);
  });

  it('updateSequenceProgress', async () => {
    mockService.updateSequenceProgress.mockResolvedValue({ ok: true });
    const result = await controller.updateSequenceProgress(
      1,
      2,
      {},
      mockUser,
      'app',
    );
    expectTrackProgressCheck('update-sequence', 1);
    expect(result).toEqual({ ok: true });
  });

  it('completeContent', async () => {
    mockService.completeContentSequence.mockResolvedValue({ ok: true });
    const result = await controller.completeContent(1, 2, mockUser, 'app');
    expectTrackProgressCheck('complete-content', 1);
    expect(result).toEqual({ ok: true });
  });

  it('completeQuiz', async () => {
    mockService.completeQuizSequence.mockResolvedValue({ ok: true });
    const result = await controller.completeQuiz(
      1,
      2,
      { quizSubmissionId: 99 },
      mockUser,
      'app',
    );
    expectTrackProgressCheck('complete-quiz', 1);
    expect(result).toEqual({ ok: true });
  });

  it('recalculate', async () => {
    mockService.recalculateTrackProgress.mockResolvedValue({ progress: 100 });
    const result = await controller.recalculate(1, mockUser, 'app');
    expectTrackProgressCheck('recalculate', 1);
    expect(result).toEqual({ progress: 100 });
  });

  it('recusa da checagem (modo enforce) impede a chamada ao serviço', async () => {
    mockAccess.checkTrackProgress.mockRejectedValue(new ForbiddenException());
    await expect(
      controller.completeQuiz(1, 2, { quizSubmissionId: 99 }, mockUser, 'app'),
    ).rejects.toThrow(ForbiddenException);
    expect(service.completeQuizSequence).not.toHaveBeenCalled();
  });
});
