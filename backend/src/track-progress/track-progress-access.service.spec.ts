import { ForbiddenException, Logger } from '@nestjs/common';
import { TrackProgressAccessService } from './track-progress-access.service';

describe('TrackProgressAccessService', () => {
  const prisma = {
    track_progress: { findUnique: jest.fn() },
    participation: { findUnique: jest.fn() },
  };
  const authz = {
    isAdmin: jest.fn(),
    hasAnyRole: jest.fn(),
  };
  const metrics = {
    recordTrackProgressAccessDenied: jest.fn(),
  };

  const owner = { id: 10, user_id: 5, context_id: 2 };
  const request = (userId: number) => ({
    userId,
    channel: 'app' as const,
    endpoint: 'complete-quiz' as const,
  });

  let service: TrackProgressAccessService;
  let warn: jest.SpyInstance;
  const originalMode = process.env.TRACK_PROGRESS_AUTHZ_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TRACK_PROGRESS_AUTHZ_MODE;
    service = new TrackProgressAccessService(
      prisma as any,
      authz as any,
      metrics as any,
    );
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    prisma.track_progress.findUnique.mockResolvedValue({
      participation: owner,
    });
    prisma.participation.findUnique.mockResolvedValue(owner);
    authz.isAdmin.mockResolvedValue(false);
    authz.hasAnyRole.mockResolvedValue(false);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  afterAll(() => {
    if (originalMode === undefined) {
      delete process.env.TRACK_PROGRESS_AUTHZ_MODE;
    } else {
      process.env.TRACK_PROGRESS_AUTHZ_MODE = originalMode;
    }
  });

  it('dono do progresso passa sem consultar papéis', async () => {
    await service.checkTrackProgress(request(5), 99);

    expect(authz.isAdmin).not.toHaveBeenCalled();
    expect(metrics.recordTrackProgressAccessDenied).not.toHaveBeenCalled();
  });

  it('admin passa', async () => {
    authz.isAdmin.mockResolvedValue(true);

    await service.checkTrackProgress(request(1), 99);

    expect(metrics.recordTrackProgressAccessDenied).not.toHaveBeenCalled();
  });

  it('manager ou content_manager do contexto da participação passa', async () => {
    authz.hasAnyRole.mockResolvedValue(true);

    await service.checkTrackProgress(request(1), 99);

    expect(authz.hasAnyRole).toHaveBeenCalledWith(1, 2, [
      'manager',
      'content_manager',
    ]);
    expect(metrics.recordTrackProgressAccessDenied).not.toHaveBeenCalled();
  });

  it('modo observação (padrão): registra e não bloqueia', async () => {
    await expect(
      service.checkTrackProgress(request(1), 99),
    ).resolves.toBeUndefined();

    expect(metrics.recordTrackProgressAccessDenied).toHaveBeenCalledWith({
      endpoint: 'complete-quiz',
      channel: 'app',
      mode: 'observe',
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'mode=observe endpoint=complete-quiz channel=app userId=1 participationId=10 ownerUserId=5 contextId=2 trackProgressId=99',
      ),
    );
  });

  it('modo enforce: registra e recusa com 403', async () => {
    process.env.TRACK_PROGRESS_AUTHZ_MODE = 'enforce';

    await expect(service.checkTrackProgress(request(1), 99)).rejects.toThrow(
      ForbiddenException,
    );
    expect(metrics.recordTrackProgressAccessDenied).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'enforce' }),
    );
  });

  it('valor desconhecido no modo cai em observação', () => {
    process.env.TRACK_PROGRESS_AUTHZ_MODE = 'Enforce ';

    expect(service.mode()).toBe('observe');
  });

  it('progresso inexistente não é checado (o serviço responde 404)', async () => {
    process.env.TRACK_PROGRESS_AUTHZ_MODE = 'enforce';
    prisma.track_progress.findUnique.mockResolvedValue(null);

    await expect(
      service.checkTrackProgress(request(1), 99),
    ).resolves.toBeUndefined();
    expect(metrics.recordTrackProgressAccessDenied).not.toHaveBeenCalled();
  });

  it('checkParticipation aplica a mesma regra à participação', async () => {
    process.env.TRACK_PROGRESS_AUTHZ_MODE = 'enforce';

    await expect(
      service.checkParticipation({ ...request(1), endpoint: 'start' }, 10),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.checkParticipation({ ...request(5), endpoint: 'start' }, 10),
    ).resolves.toBeUndefined();
  });

  it('participação inexistente não é checada', async () => {
    prisma.participation.findUnique.mockResolvedValue(null);

    await service.checkParticipation({ ...request(1), endpoint: 'start' }, 10);

    expect(metrics.recordTrackProgressAccessDenied).not.toHaveBeenCalled();
  });
});
