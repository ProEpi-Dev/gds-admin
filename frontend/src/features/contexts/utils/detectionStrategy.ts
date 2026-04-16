import type { ContextModuleCode } from '../../../types/context.types';

/** Uma estratégia por contexto no formulário; prioriza self_health se houver legado com ambos. */
export function resolveDetectionStrategyForForm(
  modules: ContextModuleCode[] | undefined | null,
): ContextModuleCode {
  const m = modules ?? [];
  if (m.includes('self_health')) return 'self_health';
  if (m.includes('community_signal')) return 'community_signal';
  return 'self_health';
}
