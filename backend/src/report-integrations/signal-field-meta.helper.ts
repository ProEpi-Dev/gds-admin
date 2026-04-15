/**
 * Metadados de campos de formulário "signal" para montagem do payload Ephem.
 * Extraído do serviço para reduzir complexidade cognitiva (Sonar).
 */
export type SignalFieldMeta = {
  label: string;
  options: Map<string, string>;
  type?: string;
  locationConfig?: {
    maxLevel?: 'COUNTRY' | 'STATE_DISTRICT' | 'CITY_COUNCIL';
    countryKey?: string;
    countryNameKey?: string;
    stateDistrictKey?: string;
    stateDistrictNameKey?: string;
    cityCouncilKey?: string;
    cityCouncilNameKey?: string;
  };
};

function parseJsonDefinitionString(definition: string): unknown {
  try {
    return JSON.parse(definition);
  } catch {
    return null;
  }
}

function collectCandidates(root: object): unknown[] {
  if (Array.isArray(root)) {
    return [...root];
  }
  const o = root as Record<string, unknown>;
  const candidates: unknown[] = [];
  if (Array.isArray(o.questions)) {
    candidates.push(...o.questions);
  }
  if (Array.isArray(o.fields)) {
    candidates.push(...o.fields);
  }
  return candidates;
}

function optionValueToMapKey(key: unknown): string {
  if (key === null || key === undefined) {
    return '';
  }
  if (typeof key === 'object') {
    try {
      return JSON.stringify(key);
    } catch {
      return '';
    }
  }
  return String(key);
}

function buildLocationConfig(
  locationConfig: Record<string, unknown>,
): SignalFieldMeta['locationConfig'] | undefined {
  const ml = locationConfig.maxLevel;
  const maxLevel =
    ml === 'COUNTRY' || ml === 'STATE_DISTRICT' || ml === 'CITY_COUNCIL'
      ? ml
      : undefined;
  return {
    maxLevel,
    countryKey:
      typeof locationConfig.countryKey === 'string'
        ? locationConfig.countryKey
        : undefined,
    countryNameKey:
      typeof locationConfig.countryNameKey === 'string'
        ? locationConfig.countryNameKey
        : undefined,
    stateDistrictKey:
      typeof locationConfig.stateDistrictKey === 'string'
        ? locationConfig.stateDistrictKey
        : undefined,
    stateDistrictNameKey:
      typeof locationConfig.stateDistrictNameKey === 'string'
        ? locationConfig.stateDistrictNameKey
        : undefined,
    cityCouncilKey:
      typeof locationConfig.cityCouncilKey === 'string'
        ? locationConfig.cityCouncilKey
        : undefined,
    cityCouncilNameKey:
      typeof locationConfig.cityCouncilNameKey === 'string'
        ? locationConfig.cityCouncilNameKey
        : undefined,
  };
}

function buildOptionsMapFromEntry(
  e: Record<string, unknown>,
): Map<string, string> {
  const options = new Map<string, string>();
  if (!Array.isArray(e.options)) {
    return options;
  }
  for (const option of e.options as Array<Record<string, unknown>>) {
    const key = option?.value;
    const optionLabel = option?.label ?? option?.text;
    if (
      key !== undefined &&
      key !== null &&
      typeof optionLabel === 'string'
    ) {
      options.set(optionValueToMapKey(key), optionLabel);
    }
  }
  return options;
}

function assignFieldMetaFromEntry(
  map: Record<string, SignalFieldMeta>,
  e: Record<string, unknown>,
): void {
  const field = e.field ?? e.name;
  const label = e.text ?? e.label ?? field;
  if (typeof field !== 'string' || typeof label !== 'string') {
    return;
  }

  const lc =
    e.locationConfig && typeof e.locationConfig === 'object'
      ? buildLocationConfig(e.locationConfig as Record<string, unknown>)
      : undefined;

  map[field] = {
    label,
    options: buildOptionsMapFromEntry(e),
    type: typeof e.type === 'string' ? e.type : undefined,
    locationConfig: lc,
  };
}

export function extractFieldMetaFromDefinition(
  definition: unknown,
): Record<string, SignalFieldMeta> {
  const map: Record<string, SignalFieldMeta> = {};
  if (!definition) {
    return map;
  }

  const parsed =
    typeof definition === 'string'
      ? parseJsonDefinitionString(definition)
      : definition;

  if (!parsed || typeof parsed !== 'object') {
    return map;
  }

  const root = parsed as Record<string, unknown>;
  const candidates = collectCandidates(root);

  for (const entry of candidates) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    assignFieldMetaFromEntry(map, entry as Record<string, unknown>);
  }

  return map;
}
