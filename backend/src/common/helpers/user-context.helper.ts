import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

/**
 * Obtém o contexto do usuário logado
 * Retorna o primeiro contexto ativo do usuário como gerenciador
 * Se o usuário não tiver contexto, lança uma exceção
 */
export async function getUserContext(
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
      created_at: 'asc', // Pega o primeiro contexto criado
    },
  });

  if (!contextManager) {
    throw new ForbiddenException(
      'Usuário não possui contexto associado ou contexto está inativo',
    );
  }

  return contextManager.context_id;
}

