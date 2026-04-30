/** Form definition field shape (subset of form-builder) used for lista no app */
type FormBuilderFieldDef = {
  name: string;
  label?: string;
  type?: string;
  options?: Array<{ value: unknown; label: string }>;
  locationConfig?: {
    countryNameKey?: string;
    stateDistrictNameKey?: string;
    cityCouncilNameKey?: string;
  };
};

type FormDefinition = {
  listPreviewFieldName?: string;
  fields?: FormBuilderFieldDef[];
};

/** Exibe um valor escalar/desconhecido sem cair em `[object Object]`. */
function displayUnknownScalar(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  if (typeof val === 'string') {
    return val;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return `${val}`;
  }
  if (typeof val === 'bigint') {
    return `${val}`;
  }
  if (typeof val === 'symbol') {
    return val.toString();
  }
  try {
    return JSON.stringify(val);
  } catch {
    return '[objeto]';
  }
}

/** Compara opção de select/multiselect com valor do formulário de forma estável. */
function comparableOptionValue(val: unknown): string {
  if (
    typeof val === 'string' ||
    typeof val === 'number' ||
    typeof val === 'boolean'
  ) {
    return String(val);
  }
  try {
    return JSON.stringify(val);
  } catch {
    return displayUnknownScalar(val);
  }
}

function formatLocationObject(value: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(value)) {
    if (val === null || val === undefined || val === '') continue;
    if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
      const inner = formatLocationObject(val as Record<string, unknown>);
      if (inner !== '-') parts.push(`${key}: ${inner}`);
    } else {
      parts.push(`${key}: ${displayUnknownScalar(val)}`);
    }
  }
  return parts.length > 0 ? parts.join(' | ') : '-';
}

function formatBooleanFieldValue(value: unknown): string {
  return value ? 'Sim' : 'Não';
}

function formatMultiselectFieldValue(
  value: unknown[],
  field: FormBuilderFieldDef,
): string {
  return value
    .map((v) => {
      const option = field.options?.find(
        (opt) => comparableOptionValue(opt.value) === comparableOptionValue(v),
      );
      return option ? option.label : displayUnknownScalar(v);
    })
    .join(', ');
}

function formatSelectFieldValue(
  value: unknown,
  field: FormBuilderFieldDef,
): string {
  const option = field.options?.find(
    (opt) => comparableOptionValue(opt.value) === comparableOptionValue(value),
  );
  return option ? option.label : displayUnknownScalar(value);
}

function formatDateFieldValue(value: unknown): string {
  return new Date(value as string | number | Date).toLocaleDateString('pt-BR');
}

function formatMapPointFieldValue(value: unknown): string {
  const lat = (value as { latitude: number }).latitude;
  const lng = (value as { longitude: number }).longitude;
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
}

function formatLocationFieldValue(
  value: Record<string, unknown>,
  field: FormBuilderFieldDef,
): string {
  const cfg = field.locationConfig;
  if (!cfg) {
    return formatLocationObject(value);
  }
  const parts: string[] = [];
  for (const key of [
    cfg.countryNameKey,
    cfg.stateDistrictNameKey,
    cfg.cityCouncilNameKey,
  ]) {
    if (!key) continue;
    const v = value[key];
    if (v !== null && v !== undefined && v !== '') {
      parts.push(displayUnknownScalar(v));
    }
  }
  if (parts.length > 0) return parts.join(' · ');
  return formatLocationObject(value);
}

function formatFieldValueByType(
  value: unknown,
  field: FormBuilderFieldDef,
): string | undefined {
  const t = field.type;
  if (t === 'boolean') {
    return formatBooleanFieldValue(value);
  }
  if (t === 'multiselect' && Array.isArray(value)) {
    return formatMultiselectFieldValue(value, field);
  }
  if (t === 'select') {
    return formatSelectFieldValue(value, field);
  }
  if (t === 'date' && value) {
    return formatDateFieldValue(value);
  }
  if (
    t === 'mapPoint' &&
    value &&
    typeof value === 'object' &&
    typeof (value as { latitude?: unknown }).latitude === 'number' &&
    typeof (value as { longitude?: unknown }).longitude === 'number'
  ) {
    return formatMapPointFieldValue(value);
  }
  if (t === 'location' && value && typeof value === 'object' && field.locationConfig) {
    return formatLocationFieldValue(value as Record<string, unknown>, field);
  }
  return undefined;
}

function formatFieldValueWithoutMeta(value: unknown): string {
  if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
    return formatLocationObject(value as Record<string, unknown>);
  }
  return displayUnknownScalar(value);
}

function formatFieldValue(
  value: unknown,
  field: FormBuilderFieldDef | undefined,
): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (!field) {
    return formatFieldValueWithoutMeta(value);
  }

  const typed = formatFieldValueByType(value, field);
  if (typed !== undefined) {
    return typed;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return formatLocationObject(value as Record<string, unknown>);
  }
  return displayUnknownScalar(value);
}

function fieldMetaByName(
  definition: FormDefinition,
): Record<string, FormBuilderFieldDef> {
  const byName: Record<string, FormBuilderFieldDef> = {};
  for (const field of definition.fields ?? []) {
    byName[field.name] = field;
  }
  return byName;
}

/**
 * Replica a lógica da listagem "Meus sinais" no app (listPreviewFieldName + fallbacks).
 */
export function buildAppListPreviewText(
  definitionJson: unknown,
  formResponseJson: unknown,
): string {
  if (
    !formResponseJson ||
    typeof formResponseJson !== 'object' ||
    Array.isArray(formResponseJson)
  ) {
    return 'Sem detalhes adicionais.';
  }

  const definition = definitionJson as FormDefinition;
  const metaByName = fieldMetaByName(definition);

  const payload = formResponseJson as Record<string, unknown>;

  const previewName =
    typeof definition.listPreviewFieldName === 'string'
      ? definition.listPreviewFieldName.trim()
      : '';
  if (previewName) {
    const raw = payload[previewName];
    const meta = metaByName[previewName];
    const hasValue = raw !== null && raw !== undefined && raw !== '';
    if (hasValue) {
      return formatFieldValue(raw, meta);
    }
    return '—';
  }

  const symptoms = Array.isArray(payload.symptoms)
    ? payload.symptoms.filter((item) => typeof item === 'string')
    : [];
  if (symptoms.length > 0) {
    return `Sintomas: ${symptoms.join(', ')}.`;
  }

  const fields = Object.entries(payload).filter(
    ([key, value]) =>
      key !== '_isValid' && value !== null && value !== undefined && value !== '',
  );
  if (fields.length === 0) {
    return 'Sem detalhes adicionais.';
  }

  return fields
    .slice(0, 2)
    .map(([key, value]) => formatFieldValue(value, metaByName[key]))
    .join(' · ');
}
