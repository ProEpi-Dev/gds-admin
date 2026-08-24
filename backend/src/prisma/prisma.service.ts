import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { readPositiveIntEnv } from '../common/cache/memory-ttl-cache';

/**
 * Tamanho do pool de conexões. Sem isso o Prisma usa `núcleos * 2 + 1`, e o
 * container enxerga os núcleos do node inteiro — em produção deu 9 conexões.
 * Nove é pouco quando uma consulta cara segura uma delas por segundos: o pool
 * esgota, o Prisma levanta P2024, e o filtro de exceção devolve 500. Foi o que
 * apareceu na manhã de 24/08 antes de o limite de CPU ser corrigido.
 */
const DEFAULT_POOL_SIZE = 20;

/**
 * Segundos esperando uma conexão livre antes de falhar. Mantido no padrão do
 * Prisma de propósito: pool maior evita a fila, mas alongar a espera sob
 * sobrecarga só empurra a falha para frente e amplifica o congestionamento.
 * Fica configurável para poder ser ajustado sem mexer no secret.
 */
const DEFAULT_POOL_TIMEOUT_SECONDS = 10;

/**
 * Acrescenta os parâmetros de pool à URL quando ela não os traz.
 *
 * O `DATABASE_URL` de produção vem de um Secret do Kubernetes e não passa pelo
 * repositório, então não há onde declará-los no manifesto. Quem já define os
 * parâmetros na própria URL — o `.env` local, por exemplo — continua mandando.
 *
 * Devolve `undefined` quando não há URL ou ela não é parseável, deixando o
 * Prisma resolver sozinho como antes.
 */
export function buildDatasourceUrl(raw?: string): string | undefined {
  if (!raw) return undefined;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }

  if (!url.searchParams.has('connection_limit')) {
    const size = readPositiveIntEnv('DATABASE_POOL_SIZE', DEFAULT_POOL_SIZE);
    url.searchParams.set(
      'connection_limit',
      String(size > 0 ? size : DEFAULT_POOL_SIZE),
    );
  }

  if (!url.searchParams.has('pool_timeout')) {
    const timeout = readPositiveIntEnv(
      'DATABASE_POOL_TIMEOUT_SECONDS',
      DEFAULT_POOL_TIMEOUT_SECONDS,
    );
    url.searchParams.set('pool_timeout', String(timeout));
  }

  return url.toString();
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const url = buildDatasourceUrl(process.env.DATABASE_URL);
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    await this.$connect();
  }
}
