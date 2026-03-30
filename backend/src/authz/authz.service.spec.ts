import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getLoggerToken } from 'nestjs-pino';
import { AuthzService } from './authz.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthzService', () => {
  let service: AuthzService;
  let prisma: PrismaService;

  const mockLogger = {
    warn: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    setContext: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthzService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
            participation: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            participation_role: {
              count: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: getLoggerToken(AuthzService.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AuthzService>(AuthzService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('deve retornar false quando usuário não existe', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await service.hasPermission(1, 1, 'content:create')).toBe(false);
    });

    it('deve retornar false quando usuário inativo', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        active: false,
        role: { code: 'participant' },
      });
      expect(await service.hasPermission(1, 1, 'content:create')).toBe(false);
    });

    it('deve retornar true quando usuário é admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        active: true,
        role: { code: 'admin' },
      });
      expect(await service.hasPermission(1, null, 'any')).toBe(true);
    });

    it('deve retornar false quando contextId é null e usuário não é admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        active: true,
        role: { code: 'participant' },
      });
      expect(await service.hasPermission(1, null, 'content:create')).toBe(false);
    });

    it('deve retornar false quando não há participação no contexto', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        active: true,
        role: { code: 'participant' },
      });
      (prisma.participation.findFirst as jest.Mock).mockResolvedValue(null);
      expect(await service.hasPermission(1, 1, 'content:create')).toBe(false);
    });

    it('deve retornar true quando participação tem permissão via role', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        active: true,
        role: { code: 'participant' },
      });
      (prisma.participation.findFirst as jest.Mock).mockResolvedValue({
        participation_role: [
          {
            role: {
              role_permission: [
                {
                  permission: { code: 'content:create', active: true },
                },
              ],
            },
          },
        ],
      });
      expect(await service.hasPermission(1, 1, 'content:create')).toBe(true);
    });

    it('deve retornar false quando permissão não bate', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        active: true,
        role: null,
      });
      (prisma.participation.findFirst as jest.Mock).mockResolvedValue({
        participation_role: [
          {
            role: {
              role_permission: [
                { permission: { code: 'other:permission', active: true } },
              ],
            },
          },
        ],
      });
      expect(await service.hasPermission(1, 1, 'content:create')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('deve retornar false quando usuário inativo', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        active: false,
        role: { code: 'participant' },
      });
      expect(await service.hasAnyRole(1, 1, ['manager'])).toBe(false);
    });

    it('deve retornar true quando role global está em roleCodes', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        active: true,
        role: { code: 'admin' },
      });
      expect(await service.hasAnyRole(1, null, ['admin', 'manager'])).toBe(
        true,
      );
    });

    it('deve retornar true quando participation_role tem um dos papéis', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        active: true,
        role: null,
      });
      (prisma.participation_role.count as jest.Mock).mockResolvedValue(1);
      expect(await service.hasAnyRole(1, 1, ['manager'])).toBe(true);
    });

    it('deve retornar true quando contextId null e roleCodes inclui participant e usuário tem participação', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        active: true,
        role: null,
      });
      (prisma.participation_role.count as jest.Mock).mockResolvedValue(0);
      (prisma.participation.count as jest.Mock).mockResolvedValue(1);
      expect(await service.hasAnyRole(1, null, ['participant'])).toBe(true);
    });

    it('deve retornar false quando nenhum papel confere', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        active: true,
        role: null,
      });
      (prisma.participation_role.count as jest.Mock).mockResolvedValue(0);
      (prisma.participation.count as jest.Mock).mockResolvedValue(0);
      expect(await service.hasAnyRole(1, null, ['manager'])).toBe(false);
    });
  });

  describe('getManagedContextIds', () => {
    it('deve retornar lista de context_id onde usuário é manager/content_manager', async () => {
      (prisma.participation.findMany as jest.Mock).mockResolvedValue([
        { context_id: 1 },
        { context_id: 2 },
      ]);
      expect(await service.getManagedContextIds(1)).toEqual([1, 2]);
    });
  });

  describe('getFirstContextIdAsManager', () => {
    it('deve retornar primeiro context_id como manager', async () => {
      (prisma.participation.findFirst as jest.Mock).mockResolvedValue({
        context_id: 5,
      });
      expect(await service.getFirstContextIdAsManager(1)).toBe(5);
    });

    it('deve retornar null quando não há participação como manager', async () => {
      (prisma.participation.findFirst as jest.Mock).mockResolvedValue(null);
      expect(await service.getFirstContextIdAsManager(1)).toBeNull();
    });
  });

  describe('getFirstContextIdForView', () => {
    it('deve retornar context_id como manager quando existir', async () => {
      (prisma.participation.findFirst as jest.Mock)
        .mockResolvedValueOnce({ context_id: 3 })
        .mockResolvedValueOnce(null);
      expect(await service.getFirstContextIdForView(1)).toBe(3);
    });

    it('deve retornar context_id como participante quando não for manager', async () => {
      (prisma.participation.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ context_id: 7 });
      expect(await service.getFirstContextIdForView(1)).toBe(7);
    });

    it('deve retornar null quando não há participação', async () => {
      (prisma.participation.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      expect(await service.getFirstContextIdForView(1)).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('deve retornar true quando user.role.code é admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { code: 'admin' },
      });
      expect(await service.isAdmin(1)).toBe(true);
    });

    it('deve retornar false quando usuário não existe', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await service.isAdmin(999)).toBe(false);
    });

    it('deve retornar false quando role não é admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { code: 'participant' },
      });
      expect(await service.isAdmin(1)).toBe(false);
    });
  });

  describe('getUserRoleSummary', () => {
    it('deve retornar admin quando role global é admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { code: 'admin' },
      });
      expect(await service.getUserRoleSummary(1)).toBe('admin');
    });

    it('deve retornar manager quando tem participation_role como manager', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: null,
      });
      (prisma.participation_role.findFirst as jest.Mock).mockResolvedValue({
        role: { code: 'manager' },
      });
      expect(await service.getUserRoleSummary(1)).toBe('manager');
    });

    it('deve retornar participant quando não é admin nem manager', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: null,
      });
      (prisma.participation_role.findFirst as jest.Mock).mockResolvedValue(null);
      expect(await service.getUserRoleSummary(1)).toBe('participant');
    });
  });

  describe('getParticipantContextIds', () => {
    it('deve retornar context_ids de participações ativas', async () => {
      (prisma.participation.findMany as jest.Mock).mockResolvedValue([
        { context_id: 10 },
        { context_id: 20 },
      ]);
      expect(await service.getParticipantContextIds(1)).toEqual([10, 20]);
    });
  });

  describe('resolveListContextId', () => {
    it('deve lançar BadRequestException quando admin não informa contextId', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { code: 'admin' },
      });
      await expect(
        service.resolveListContextId(1, undefined, 'GET /contents'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve retornar queryContextId quando admin informa', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { code: 'admin' },
      });
      expect(
        await service.resolveListContextId(1, 42, 'GET /contents'),
      ).toBe(42);
    });

    it('deve retornar primeiro contexto gerenciado quando não-admin sem queryContextId', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { code: 'participant' },
      });
      (prisma.participation.findMany as jest.Mock).mockResolvedValue([
        { context_id: 1 },
        { context_id: 2 },
      ]);
      expect(
        await service.resolveListContextId(1, undefined, 'GET /contents'),
      ).toBe(1);
    });

    it('deve usar participant contextIds quando allowParticipantContext e sem managed', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: null,
      });
      (prisma.participation.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ context_id: 99 }]);
      expect(
        await service.resolveListContextId(
          1,
          undefined,
          'GET /forms',
          { allowParticipantContext: true },
        ),
      ).toBe(99);
    });

    it('deve lançar ForbiddenException quando não há contextos permitidos', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: null,
      });
      (prisma.participation.findMany as jest.Mock).mockResolvedValue([]);
      await expect(
        service.resolveListContextId(1, undefined, 'GET /contents'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve retornar queryContextId quando está em allowedContextIds', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: null,
      });
      (prisma.participation.findMany as jest.Mock).mockResolvedValue([
        { context_id: 1 },
        { context_id: 2 },
      ]);
      expect(
        await service.resolveListContextId(1, 2, 'GET /contents'),
      ).toBe(2);
    });

    it('deve lançar ForbiddenException quando queryContextId não está permitido', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: null,
      });
      (prisma.participation.findMany as jest.Mock).mockResolvedValue([
        { context_id: 1 },
        { context_id: 2 },
      ]);
      await expect(
        service.resolveListContextId(1, 99, 'GET /contents'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPermissionDiagnosticsForLog', () => {
    it('deve ordenar permissões e contextos para diagnóstico', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { code: 'participant' },
      });
      (prisma.participation.findMany as jest.Mock).mockResolvedValue([
        {
          context_id: 10,
          participation_role: [
            {
              role: {
                role_permission: [
                  { permission: { code: 'zebra:action', active: true } },
                  { permission: { code: 'alpha:action', active: true } },
                ],
              },
            },
          ],
        },
        {
          context_id: 2,
          participation_role: [
            {
              role: {
                role_permission: [
                  { permission: { code: 'beta:read', active: true } },
                ],
              },
            },
          ],
        },
      ]);

      const diag = await service.getPermissionDiagnosticsForLog(1, 10);

      expect(diag.permissoes_nesse_contexto).toEqual([
        'alpha:action',
        'zebra:action',
      ]);
      expect(diag.permissoes_por_contexto).toEqual([
        { context_id: 2, permissoes: ['beta:read'] },
        { context_id: 10, permissoes: ['alpha:action', 'zebra:action'] },
      ]);
      expect(diag.todas_perm_distintas_em_participacoes).toEqual([
        'alpha:action',
        'beta:read',
        'zebra:action',
      ]);
    });

    it('admin recebe diagnóstico sem lista de permissões de participação', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { code: 'admin' },
      });

      const diag = await service.getPermissionDiagnosticsForLog(1, 5);

      expect(diag.contexto_usado_na_checagem).toBe(5);
      expect(diag.permissoes_nesse_contexto).toEqual([]);
      expect(diag.nota).toContain('admin global');
      expect(prisma.participation.findMany).not.toHaveBeenCalled();
    });

    it('deve incluir nota quando não há contextId na requisição', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { code: 'participant' },
      });
      (prisma.participation.findMany as jest.Mock).mockResolvedValue([
        {
          context_id: 1,
          participation_role: [
            {
              role: {
                role_permission: [
                  { permission: { code: 'p:x', active: true } },
                ],
              },
            },
          ],
        },
      ]);

      const diag = await service.getPermissionDiagnosticsForLog(1, null);

      expect(diag.permissoes_nesse_contexto).toEqual([]);
      expect(diag.nota).toContain('Nenhum contextId');
    });

    it('deve incluir nota quando o contexto da requisição não tem permissões mas outros têm', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { code: 'participant' },
      });
      (prisma.participation.findMany as jest.Mock).mockResolvedValue([
        {
          context_id: 1,
          participation_role: [
            {
              role: {
                role_permission: [
                  { permission: { code: 'only:here', active: true } },
                ],
              },
            },
          ],
        },
      ]);

      const diag = await service.getPermissionDiagnosticsForLog(1, 99);

      expect(diag.permissoes_nesse_contexto).toEqual([]);
      expect(diag.nota).toContain('outros contextos');
    });
  });
});
