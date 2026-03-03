import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getLoggerToken } from 'nestjs-pino';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { AuthzService } from '../authz.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let authz: AuthzService;

  const mockLogger = { warn: jest.fn(), setContext: jest.fn() };

  function createMockContext(overrides: {
    user?: any;
    params?: any;
    query?: any;
    body?: any;
    method?: string;
    url?: string;
    ip?: string;
  } = {}): ExecutionContext {
    const request: any = {
      params: overrides.params ?? {},
      query: overrides.query ?? {},
      body: overrides.body ?? {},
      method: overrides.method ?? 'GET',
      url: overrides.url ?? '/test',
      ip: overrides.ip ?? '127.0.0.1',
    };
    request.user = overrides.hasOwnProperty('user') ? overrides.user : { userId: 1 };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        {
          provide: AuthzService,
          useValue: {
            hasPermission: jest.fn(),
            hasAnyRole: jest.fn(),
            getUserRoleSummary: jest.fn().mockResolvedValue('participant'),
          },
        },
        {
          provide: getLoggerToken(RolesGuard.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
    authz = module.get<AuthzService>(AuthzService);
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('deve retornar true quando não há roles nem permission exigidos', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === ROLES_KEY) return undefined;
        if (key === REQUIRE_PERMISSION_KEY) return undefined;
        return undefined;
      });

      const ctx = createMockContext();
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(authz.hasPermission).not.toHaveBeenCalled();
      expect(authz.hasAnyRole).not.toHaveBeenCalled();
    });

    it('deve retornar true quando requiredRoles é array vazio e sem permission', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === ROLES_KEY) return [];
        if (key === REQUIRE_PERMISSION_KEY) return undefined;
        return undefined;
      });

      const result = await guard.canActivate(createMockContext());
      expect(result).toBe(true);
    });

    it('deve lançar ForbiddenException quando usuário não está autenticado', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === ROLES_KEY) return ['admin'];
        return undefined;
      });

      const ctx = createMockContext({ user: null });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        'Usuário não autenticado',
      );
    });

    it('deve lançar quando user.userId está ausente', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === ROLES_KEY) return ['manager'];
        return undefined;
      });

      const ctx = createMockContext({ user: {} });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('deve permitir quando requiredPermission e hasPermission retorna true', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === ROLES_KEY) return undefined;
        if (key === REQUIRE_PERMISSION_KEY) return 'content:create';
        return undefined;
      });
      (authz.hasPermission as jest.Mock).mockResolvedValue(true);

      const result = await guard.canActivate(createMockContext());

      expect(result).toBe(true);
      expect(authz.hasPermission).toHaveBeenCalledWith(1, null, 'content:create');
    });

    it('deve negar e lançar quando requiredPermission e hasPermission retorna false', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === ROLES_KEY) return undefined;
        if (key === REQUIRE_PERMISSION_KEY) return 'content:delete';
        return undefined;
      });
      (authz.hasPermission as jest.Mock).mockResolvedValue(false);
      (authz.getUserRoleSummary as jest.Mock).mockResolvedValue('participant');

      const ctx = createMockContext();

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        'Permissão necessária: content:delete',
      );
      expect(authz.getUserRoleSummary).toHaveBeenCalledWith(1);
    });

    it('deve permitir quando requiredRoles e hasAnyRole retorna true', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === ROLES_KEY) return ['admin', 'manager'];
        if (key === REQUIRE_PERMISSION_KEY) return undefined;
        return undefined;
      });
      (authz.hasAnyRole as jest.Mock).mockResolvedValue(true);

      const result = await guard.canActivate(createMockContext());

      expect(result).toBe(true);
      expect(authz.hasAnyRole).toHaveBeenCalledWith(1, null, ['admin', 'manager']);
    });

    it('deve negar e lançar quando requiredRoles e hasAnyRole retorna false', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === ROLES_KEY) return ['admin'];
        return undefined;
      });
      (authz.hasAnyRole as jest.Mock).mockResolvedValue(false);
      (authz.getUserRoleSummary as jest.Mock).mockResolvedValue('participant');

      const ctx = createMockContext();

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        /Papel necessário: um de \[admin\]/,
      );
      expect(authz.getUserRoleSummary).toHaveBeenCalledWith(1);
    });

    it('deve extrair contextId de request.params.contextId', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === ROLES_KEY) return ['manager'];
        return undefined;
      });
      (authz.hasAnyRole as jest.Mock).mockResolvedValue(true);

      const ctx = createMockContext({ params: { contextId: '5' } });
      await guard.canActivate(ctx);

      expect(authz.hasAnyRole).toHaveBeenCalledWith(1, 5, ['manager']);
    });

    it('deve extrair contextId de request.query quando params não tem', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === ROLES_KEY) return ['manager'];
        return undefined;
      });
      (authz.hasAnyRole as jest.Mock).mockResolvedValue(true);

      const ctx = createMockContext({
        params: {},
        query: { contextId: '10' },
      });
      await guard.canActivate(ctx);

      expect(authz.hasAnyRole).toHaveBeenCalledWith(1, 10, ['manager']);
    });
  });
});
