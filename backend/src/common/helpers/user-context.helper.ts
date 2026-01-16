import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

/**
 * Obtém o context_id do usuário (manager OU participante)
 * Usado para VISUALIZAR formulários e conteúdos
 * Prioriza o papel de gerenciador se o usuário tiver ambos
 */
export async function getUserContextId(
  prisma: PrismaService,
  userId: number,
): Promise<number> {
  // Primeiro tenta como manager
  const contextManager = await prisma.context_manager.findFirst({
    where: {
      user_id: userId,
      active: true,
      context: {
        active: true,
      },
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  if (contextManager) {
    return contextManager.context_id;
  }

  // Se não for manager, tenta como participante
  const participation = await prisma.participation.findFirst({
    where: {
      user_id: userId,
      active: true,
      context: {
        active: true,
      },
      start_date: {
        lte: new Date(),
      },
      OR: [
        { end_date: null },
        { end_date: { gte: new Date() } },
      ],
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  if (participation) {
    return participation.context_id;
  }

  throw new ForbiddenException(
    'Usuário não possui contexto associado ou contexto está inativo',
  );
}

/**
 * Verifica se o usuário é GERENCIADOR do contexto
 * Usado para CRIAR/EDITAR/DELETAR formulários e conteúdos
 * Retorna o context_id do primeiro contexto gerenciado
 */
export async function getUserContextAsManager(
  prisma: PrismaService,
  userId: number,
): Promise<number> {
  const contextManager = await prisma.context_manager.findFirst({
    where: {
      user_id: userId,
      active: true,
      context: {
        active: true,
      },
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  if (!contextManager) {
    throw new ForbiddenException(
      'Usuário não é gerenciador de nenhum contexto ativo',
    );
  }

  return contextManager.context_id;
}

/**
 * Obtém o participation_id do usuário
 * Usado para RESPONDER formulários (criar reports/quiz submissions)
 * Verifica se a participação está dentro do período ativo
 */
export async function getUserParticipationId(
  prisma: PrismaService,
  userId: number,
  contextId?: number,
): Promise<number> {
  const where: any = {
    user_id: userId,
    active: true,
    context: {
      active: true,
    },
    start_date: {
      lte: new Date(),
    },
    OR: [
      { end_date: null },
      { end_date: { gte: new Date() } },
    ],
  };

  if (contextId) {
    where.context_id = contextId;
  }

  const participation = await prisma.participation.findFirst({
    where,
    orderBy: {
      created_at: 'desc',
    },
  });

  if (!participation) {
    throw new ForbiddenException(
      contextId
        ? `Usuário não possui participação ativa no contexto ${contextId}`
        : 'Usuário não possui participação ativa',
    );
  }

  return participation.id;
}/**
 * @deprecated Use getUserContextId para visualização ou getUserContextAsManager para operações de gestão
 */
export async function getUserContext(
  prisma: PrismaService,
  userId: number,
): Promise<number> {
  return getUserContextId(prisma, userId);
}
