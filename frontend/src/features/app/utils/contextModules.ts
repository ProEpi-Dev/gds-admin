import type { ContextModuleCode } from "../../../types/context.types";

export const DEFAULT_WEB_APP_MODULES: ContextModuleCode[] = ["self_health"];

export function resolveEnabledModules(
  modules?: ContextModuleCode[] | null,
): ContextModuleCode[] {
  if (!Array.isArray(modules) || modules.length === 0) {
    return DEFAULT_WEB_APP_MODULES;
  }
  const set = new Set(modules);
  const ordered: ContextModuleCode[] = [];
  if (set.has("self_health")) ordered.push("self_health");
  if (set.has("community_signal")) ordered.push("community_signal");
  return ordered.length > 0 ? ordered : DEFAULT_WEB_APP_MODULES;
}

export function hasModule(
  modules: ContextModuleCode[],
  moduleCode: ContextModuleCode,
): boolean {
  return modules.includes(moduleCode);
}
