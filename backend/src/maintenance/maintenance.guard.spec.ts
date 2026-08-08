import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MaintenanceGuard } from './maintenance.guard';
import {
  ActiveMaintenanceWindow,
  MaintenanceService,
} from './maintenance.service';
import { AuthzService } from '../authz/authz.service';

const WINDOW: ActiveMaintenanceWindow = {
  mode: 'full',
  title: { pt: 'Manutenção programada' },
  message: { pt: 'Voltamos às 6h' },
  startsAt: new Date('2026-08-10T02:00:00.000Z'),
  endsAt: new Date('2026-08-10T06:00:00.000Z'),
};

describe('MaintenanceGuard', () => {
  let guard: MaintenanceGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let maintenance: { getActiveWindow: jest.Mock; resolveText: jest.Mock };
  let authz: { isAdmin: jest.Mock };
  let logger: { warn: jest.Mock };

  const buildContext = (
    request: Record<string, unknown> = {},
  ): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/v1/reports', ...request }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    maintenance = {
      getActiveWindow: jest.fn().mockResolvedValue(null),
      resolveText: jest.fn((value: Record<string, string>) => value?.pt ?? ''),
    };
    authz = { isAdmin: jest.fn().mockResolvedValue(false) };
    logger = { warn: jest.fn() };

    guard = new MaintenanceGuard(
      reflector as unknown as Reflector,
      maintenance as unknown as MaintenanceService,
      authz as unknown as AuthzService,
      logger as never,
    );
  });

  it('libera quando não há janela ativa', async () => {
    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
  });

  it('libera endpoint marcado com AllowDuringMaintenance sem consultar a janela', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    expect(maintenance.getActiveWindow).not.toHaveBeenCalled();
  });

  it('modo banner não bloqueia nada', async () => {
    maintenance.getActiveWindow.mockResolvedValue({
      ...WINDOW,
      mode: 'banner',
    });

    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
  });

  describe('modo read_only', () => {
    beforeEach(() => {
      maintenance.getActiveWindow.mockResolvedValue({
        ...WINDOW,
        mode: 'read_only',
      });
    });

    it.each(['GET', 'HEAD', 'OPTIONS'])('libera %s', async (method) => {
      await expect(guard.canActivate(buildContext({ method }))).resolves.toBe(
        true,
      );
    });

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
      'bloqueia %s',
      async (method) => {
        await expect(
          guard.canActivate(buildContext({ method })),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
      },
    );
  });

  describe('modo full', () => {
    beforeEach(() => {
      maintenance.getActiveWindow.mockResolvedValue(WINDOW);
    });

    it('bloqueia até leitura', async () => {
      await expect(
        guard.canActivate(buildContext({ method: 'GET' })),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('libera admin para que ele possa encerrar a janela', async () => {
      authz.isAdmin.mockResolvedValue(true);

      await expect(
        guard.canActivate(buildContext({ user: { userId: 7 } })),
      ).resolves.toBe(true);
      expect(authz.isAdmin).toHaveBeenCalledWith(7);
    });

    it('não libera usuário autenticado que não é admin', async () => {
      await expect(
        guard.canActivate(buildContext({ user: { userId: 7 } })),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('não consulta papel quando não há usuário resolvido', async () => {
      await expect(guard.canActivate(buildContext())).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(authz.isAdmin).not.toHaveBeenCalled();
    });

    it('monta o payload que o cliente usa para distinguir de um 503 do proxy', async () => {
      expect.assertions(1);

      try {
        await guard.canActivate(buildContext());
      } catch (error) {
        expect((error as ServiceUnavailableException).getResponse()).toEqual({
          code: 'MAINTENANCE',
          message: 'Voltamos às 6h',
          maintenance: {
            mode: 'full',
            title: 'Manutenção programada',
            startsAt: '2026-08-10T02:00:00.000Z',
            endsAt: '2026-08-10T06:00:00.000Z',
          },
        });
      }
    });

    it('envia endsAt nulo quando não há previsão de retorno', async () => {
      expect.assertions(1);
      maintenance.getActiveWindow.mockResolvedValue({
        ...WINDOW,
        endsAt: null,
      });

      try {
        await guard.canActivate(buildContext());
      } catch (error) {
        const body = (error as ServiceUnavailableException).getResponse();
        expect(
          (body as { maintenance: { endsAt: null } }).maintenance.endsAt,
        ).toBeNull();
      }
    });

    it('repassa o Accept-Language para a resolução do texto', async () => {
      try {
        await guard.canActivate(
          buildContext({ headers: { 'accept-language': 'en-US,en;q=0.9' } }),
        );
      } catch {
        // esperado
      }

      expect(maintenance.resolveText).toHaveBeenCalledWith(
        WINDOW.message,
        'en-US,en;q=0.9',
      );
    });

    it('registra o bloqueio', async () => {
      try {
        await guard.canActivate(buildContext());
      } catch {
        // esperado
      }

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'MAINTENANCE_BLOCKED', mode: 'full' }),
        expect.any(String),
      );
    });
  });
});
