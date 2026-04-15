import type { SignalFieldMeta } from './signal-field-meta.helper';

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getLocationLevelMappings(meta?: SignalFieldMeta): Array<{
  idKey: string;
  nameKey?: string;
}> {
  const config = meta?.locationConfig;
  if (!config) {
    return [];
  }

  const mappings: Array<{ idKey: string; nameKey?: string }> = [];
  if (config.countryKey) {
    mappings.push({ idKey: config.countryKey, nameKey: config.countryNameKey });
  }
  if (config.stateDistrictKey) {
    mappings.push({
      idKey: config.stateDistrictKey,
      nameKey: config.stateDistrictNameKey,
    });
  }
  if (config.cityCouncilKey) {
    mappings.push({
      idKey: config.cityCouncilKey,
      nameKey: config.cityCouncilNameKey,
    });
  }
  return mappings;
}

export function extractLocationIdsRequiringLookup(
  entries: Array<{ field: string; value: unknown }>,
  metaMap: Record<string, SignalFieldMeta>,
): number[] {
  const ids = new Set<number>();

  for (const entry of entries) {
    const meta = metaMap[entry.field];
    if (meta?.type !== 'location') {
      continue;
    }
    if (!entry.value || typeof entry.value !== 'object') {
      continue;
    }

    const valueObj = entry.value as Record<string, unknown>;
    const levelMappings = getLocationLevelMappings(meta);

    if (levelMappings.length === 0) {
      for (const rawValue of Object.values(valueObj)) {
        const parsed = Number(rawValue);
        if (Number.isInteger(parsed) && parsed > 0) {
          ids.add(parsed);
        }
      }
      continue;
    }

    for (const mapping of levelMappings) {
      const rawId = valueObj[mapping.idKey];
      const parsedId = Number(rawId);
      const rawName = mapping.nameKey ? valueObj[mapping.nameKey] : undefined;
      if (
        Number.isInteger(parsedId) &&
        parsedId > 0 &&
        !isNonEmptyString(rawName)
      ) {
        ids.add(parsedId);
      }
    }
  }

  return Array.from(ids);
}
