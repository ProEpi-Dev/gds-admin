import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

/**
 * Serviço de autorização RBAC.
 * Centraliza a lógica de verificação de papéis e permissões (global e por contexto).
 */
@Injectable()
export class AuthzService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(AuthzService.name) private readonly logger: PinoLogger,
  ) {}

  /**
   * Verifica se o usuário tem a permissão indicada.
   * - Admin global (user.role_id = admin): sempre true.
   * - contextId null: só permissões globais (admin).
   * - contextId definido: permissões via participation_role + role_permission.
   */
  async hasPermission(
    userId: number,
    contextId: number | null,
    permissionCode: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user?.active) return false;

    if (user.role?.code === 'admin') return true;

    if (contextId == null) return false;

    const participation = await this.prisma.participation.findFirst({
      where: {
        user_id: userId,
        context_id: contextId,
        active: true,
        context: { active: true },
      },
      include: {
        participation_role: {
          include: {
            role: {
              include: {
                role_permission: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!participation) return false;

    for (const pr of participation.participation_role) {
      for (const rp of pr.role.role_permission) {
        if (rp.permission.active && rp.permission.code === permissionCode)
          return true;
      }
    }
    return false;
  }

  /**
   * Diagnóstico para logs quando falha checagem de permissão (uma consulta às participações).
   * Explica diferença entre "permissões no contexto da requisição" vs "em algum contexto".
   */
  async getPermissionDiagnosticsForLog(
    userId: number,
    requestContextId: number | null,
  ): Promise<{
    contexto_usado_na_checagem: number | 'nenhum';
    permissoes_nesse_contexto: string[];
    permissoes_por_contexto: Array<{ context_id: number; permissoes: string[] }>;
    todas_perm_distintas_em_participacoes: string[];
    nota?: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { code: true } } },
    });
    if (user?.role?.code === 'admin') {
      return {
        contexto_usado_na_checagem: requestContextId ?? 'nenhum',
        permissoes_nesse_contexto: [],
        permissoes_por_contexto: [],
        todas_perm_distintas_em_participacoes: [],
        nota: 'Usuário é admin global; falha de permissão é inesperada.',
      };
    }

    const participations = await this.prisma.participation.findMany({
      where: {
        user_id: userId,
        active: true,
        context: { active: true },
      },
      select: {
        context_id: true,
        participation_role: {
          select: {
            role: {
              select: {
                role_permission: {
                  select: {
                    permission: { select: { code: true, active: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const byContext = new Map<number, Set<string>>();
    const allCodes = new Set<string>();

    for (const p of participations) {
      let set = byContext.get(p.context_id);
      if (!set) {
        set = new Set();
        byContext.set(p.context_id, set);
      }
      for (const pr of p.participation_role) {
        for (const rp of pr.role.role_permission) {
          if (rp.permission.active) {
            set.add(rp.permission.code);
            allCodes.add(rp.permission.code);
          }
        }
      }
    }

    const permissoes_nesse_contexto =
      requestContextId != null
        ? [...(byContext.get(requestContextId) ?? new Set())].sort((a, b) =>
            a.localeCompare(b),
          )
        : [];

    const permissoes_por_contexto = [...byContext.entries()]
      .map(([context_id, codes]) => ({
        context_id,
        permissoes: [...codes].sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.context_id - b.context_id);

    let nota: string | undefined;
    if (requestContextId == null) {
      nota =
        'Nenhum contextId na requisição (query/body/params). Para papéis de contexto, a API precisa do contexto para avaliar role_permission.';
    } else if (permissoes_nesse_contexto.length === 0 && allCodes.size > 0) {
      nota =
        'Há permissões em outros contextos, mas não neste contexto ou sem participação ativa aqui.';
    }

    return {
      contexto_usado_na_checagem: requestContextId ?? 'nenhum',
      permissoes_nesse_contexto,
      permissoes_por_contexto,
      todas_perm_distintas_em_participacoes: [...allCodes].sort((a, b) =>
        a.localeCompare(b),
      ),
      ...(nota ? { nota } : {}),
    };
  }

  /**
   * Verifica se o usuário tem pelo menos um dos papéis.
   * - contextId definido: verifica naquele contexto específico.
   * - contextId null: verifica em QUALQUER contexto ativo (útil para guards sem contextId na URL).
   * - Usuário com papel global (admin) sempre passa se 'admin' está em roleCodes.
   */
  async hasAnyRole(
    userId: number,
    contextId: number | null,
    roleCodes: string[],
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user?.active) return false;

    if (user.role && roleCodes.includes(user.role.code)) return true;

    const participationWhere: any = {
      user_id: userId,
      active: true,
      context: { active: true },
    };
    if (contextId != null) {
      participationWhere.context_id = contextId;
    }

    const count = await this.prisma.participation_role.count({
      where: {
        participation: participationWhere,
        role: {
          code: { in: roleCodes },
          active: true,
        },
      },
    });
    if (count > 0) return true;

    // Sem contextId na requisição: quem tem participação ativa conta como "participant"
    // (permite GET /users próprio e GET /forms usando contexto derivado no service)
    if (
      contextId == null &&
      roleCodes.includes('participant')
    ) {
      const participationCount = await this.prisma.participation.count({
        where: {
          user_id: userId,
          active: true,
          context: { active: true },
          start_date: { lte: new Date() },
          OR: [{ end_date: null }, { end_date: { gte: new Date() } }],
        },
      });
      if (participationCount > 0) return true;
    }

    return false;
  }

  /**
   * Retorna todos os context_id em que o usuário atua como manager ou content_manager.
   */
  async getManagedContextIds(userId: number): Promise<number[]> {
    const list = await this.prisma.participation.findMany({
      where: {
        user_id: userId,
        active: true,
        context: { active: true },
        participation_role: {
          some: {
            role: {
              code: { in: ['manager', 'content_manager'] },
              active: true,
            },
          },
        },
      },
      select: { context_id: true },
      distinct: ['context_id'],
    });
    return list.map((p) => p.context_id);
  }

  /**
   * Retorna o primeiro context_id em que o usuário atua como manager ou content_manager.
   */
  async getFirstContextIdAsManager(userId: number): Promise<number | null> {
    const found = await this.prisma.participation.findFirst({
      where: {
        user_id: userId,
        active: true,
        context: { active: true },
        participation_role: {
          some: {
            role: {
              code: { in: ['manager', 'content_manager'] },
              active: true,
            },
          },
        },
      },
      orderBy: { created_at: 'asc' },
      select: { context_id: true },
    });
    return found?.context_id ?? null;
  }

  /**
   * Retorna o primeiro context_id para visualização: manager/content_manager ou participante.
   */
  async getFirstContextIdForView(userId: number): Promise<number | null> {
    const asManager = await this.getFirstContextIdAsManager(userId);
    if (asManager != null) return asManager;

    const participation = await this.prisma.participation.findFirst({
      where: {
        user_id: userId,
        active: true,
        context: { active: true },
        start_date: { lte: new Date() },
        OR: [{ end_date: null }, { end_date: { gte: new Date() } }],
      },
      orderBy: { created_at: 'desc' },
      select: { context_id: true },
    });
    return participation?.context_id ?? null;
  }

  /**
   * Verifica se o usuário é admin global.
   */
  async isAdmin(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { code: true } } },
    });
    return user?.role?.code === 'admin';
  }

  /**
   * Retorna um rótulo do papel do usuário para uso em logs (ex.: "admin", "manager", "participant").
   */
  async getUserRoleSummary(userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { code: true } } },
    });
    if (user?.role?.code === 'admin') return 'admin';

    const managerParticipation = await this.prisma.participation_role.findFirst({
      where: {
        participation: {
          user_id: userId,
          active: true,
          context: { active: true },
        },
        role: {
          code: { in: ['manager', 'content_manager'] },
          active: true,
        },
      },
      select: { role: { select: { code: true } } },
    });
    if (managerParticipation) return managerParticipation.role?.code ?? 'participant';

    return 'participant';
  }

  /**
   * Retorna os context_id em que o usuário possui participação ativa (para papel participant).
   */
  async getParticipantContextIds(userId: number): Promise<number[]> {
    const list = await this.prisma.participation.findMany({
      where: {
        user_id: userId,
        active: true,
        context: { active: true },
        start_date: { lte: new Date() },
        OR: [{ end_date: null }, { end_date: { gte: new Date() } }],
      },
      select: { context_id: true },
      distinct: ['context_id'],
    });
    return list.map((p) => p.context_id);
  }

  /**
   * Resolve o contextId para listagens protegidas por contexto.
   *
   * Regras:
   *   - Admin sem contextId  → BadRequest (loga WARN)
   *   - Admin com contextId  → usa o contextId informado
   *   - Não-admin (manager/content_manager): usa contextos gerenciados
   *   - Não-admin sem contextos gerenciados e allowParticipantContext: usa contextos de participação (participant)
   *
   * @param userId         ID do usuário autenticado
   * @param queryContextId contextId vindo da query (pode ser undefined)
   * @param endpoint       Descrição do endpoint para rastreabilidade (ex.: "GET /contents")
   * @param options.allowParticipantContext quando true, se não houver contextos gerenciados, usa contextos em que o usuário participa
   */
  async resolveListContextId(
    userId: number,
    queryContextId: number | undefined,
    endpoint: string,
    options?: { allowParticipantContext?: boolean },
  ): Promise<number> {
    const isAdmin = await this.isAdmin(userId);

    if (isAdmin) {
      if (queryContextId == null) {
        this.logger.warn(
          { event: 'CONTEXT_MISSING', endpoint, userId },
          'contextId não informado pelo admin',
        );
        throw new BadRequestException(
          'contextId é obrigatório. Selecione um contexto no cabeçalho da aplicação.',
        );
      }
      return queryContextId;
    }

    let allowedContextIds = await this.getManagedContextIds(userId);

    if (allowedContextIds.length === 0 && options?.allowParticipantContext) {
      allowedContextIds = await this.getParticipantContextIds(userId);
    }

    if (allowedContextIds.length === 0) {
      this.logger.warn(
        { event: 'ACCESS_DENIED', reason: 'no_active_context', endpoint, userId },
        'Sem contextos gerenciados nem participação ativa',
      );
      throw new ForbiddenException('Usuário não gerencia nenhum contexto ativo.');
    }

    if (queryContextId != null) {
      if (!allowedContextIds.includes(queryContextId)) {
        this.logger.warn(
          {
            event: 'ACCESS_DENIED',
            reason: 'context_not_allowed',
            endpoint,
            userId,
            contextId: queryContextId,
            contextos_permitidos: allowedContextIds,
          },
          'Tentativa de acesso a contexto não permitido',
        );
        throw new ForbiddenException('Usuário não tem acesso ao contexto solicitado.');
      }
      return queryContextId;
    }

    return allowedContextIds[0];
  }
}
