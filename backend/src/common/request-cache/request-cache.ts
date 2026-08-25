import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Memoização com validade de uma única requisição HTTP.
 *
 * O caminho de autorização resolve a mesma coisa várias vezes por requisição: o
 * `RolesGuard` consulta papel, o serviço chama `isAdmin` e depois deriva o
 * contexto do usuário — cada um com sua própria ida ao banco. Amostragem de
 * `pg_stat_activity` em produção mostrou que essas consultas somavam ~60% do
 * tempo ativo do PostgreSQL.
 *
 * O armazenamento vive só enquanto a requisição existe, então não há
 * invalidação a fazer nem risco de servir permissão revogada: a próxima
 * requisição começa com o mapa vazio.
 */
const storage = new AsyncLocalStorage<Map<string, Promise<unknown>>>();

/** Executa `fn` sob um mapa novo, isolado desta requisição. */
export function runWithRequestCache<T>(fn: () => T): T {
  return storage.run(new Map(), fn);
}

/**
 * Devolve o valor memoizado de `key` ou executa `factory` e memoiza.
 *
 * Fora de uma requisição — testes unitários, tarefas agendadas, scripts — não há
 * mapa ativo e a chamada simplesmente delega para `factory`. É o que mantém o
 * uso opcional: quem não passou pelo middleware continua funcionando igual.
 *
 * Guarda-se a Promise, não o valor resolvido, para que chamadas concorrentes
 * dentro da mesma requisição compartilhem uma única ida ao banco. Se ela falhar,
 * a entrada é descartada — senão o erro ficaria grudado no resto da requisição.
 */
export function cachedForRequest<T>(
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  const store = storage.getStore();
  if (!store) return factory();

  // Comparar com `undefined` em vez de testar a Promise: uma Promise e sempre
  // truthy, entao `if (hit)` funcionaria por acidente e leria como bug.
  const hit = store.get(key);
  if (hit !== undefined) return hit as Promise<T>;

  const pending = factory().catch((error) => {
    store.delete(key);
    throw error;
  });
  store.set(key, pending);
  return pending;
}

/** Exposto para os testes verificarem o comportamento fora de requisição. */
export function hasRequestCache(): boolean {
  return storage.getStore() !== undefined;
}
