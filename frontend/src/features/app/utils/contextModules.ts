import type { ContextModuleCode } from "../../../types/context.types";

export const DEFAULT_WEB_APP_MODULES: ContextModuleCode[] = ["self_health"];

/**
 * Estratégia de detecção única por contexto. Se a API ainda retornar legado com
 * os dois módulos, prioriza `self_health` (mesma regra do admin).
 */
export function resolveEnabledModules(
  modules?: ContextModuleCode[] | null,
): ContextModuleCode[] {
  if (!Array.isArray(modules) || modules.length === 0) {
    return DEFAULT_WEB_APP_MODULES;
  }
  const set = new Set(modules);
  if (set.has("self_health")) return ["self_health"];
  if (set.has("community_signal")) return ["community_signal"];
  return DEFAULT_WEB_APP_MODULES;
}

export function hasModule(
  modules: ContextModuleCode[],
  moduleCode: ContextModuleCode,
): boolean {
  return modules.includes(moduleCode);
}
