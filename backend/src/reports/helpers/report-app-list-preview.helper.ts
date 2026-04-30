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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function formatLocationObject(value: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(value)) {
    if (val === null || val === undefined || val === '') continue;
    if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
      const inner = formatLocationObject(val as Record<string, unknown>);
      if (inner !== '-') parts.push(`${key}: ${inner}`);
    } else {
      parts.push(`${key}: ${String(val)}`);
    }
  }
  return parts.length > 0 ? parts.join(' | ') : '-';
}

function formatFieldValue(
  value: unknown,
  field: FormBuilderFieldDef | undefined,
): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (!field) {
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      return formatLocationObject(value as Record<string, unknown>);
    }
    return String(value);
  }

  const t = field.type;
  if (t === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  if (t === 'multiselect' && Array.isArray(value)) {
    return value
      .map((v) => {
        const option = field.options?.find((opt) => String(opt.value) === String(v));
        return option ? option.label : String(v);
      })
      .join(', ');
  }
  if (t === 'select') {
    const option = field.options?.find((opt) => String(opt.value) === String(value));
    return option ? option.label : String(value);
  }
  if (t === 'date' && value) {
    return new Date(value as string | number | Date).toLocaleDateString('pt-BR');
  }
  if (
    t === 'mapPoint' &&
    value &&
    typeof value === 'object' &&
    typeof (value as { latitude?: unknown }).latitude === 'number' &&
    typeof (value as { longitude?: unknown }).longitude === 'number'
  ) {
    const lat = (value as { latitude: number }).latitude;
    const lng = (value as { longitude: number }).longitude;
    return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
  }
  if (t === 'location' && value && typeof value === 'object' && field.locationConfig) {
    const cfg = field.locationConfig;
    const rec = value as Record<string, unknown>;
    const parts: string[] = [];
    for (const key of [
      cfg.countryNameKey,
      cfg.stateDistrictNameKey,
      cfg.cityCouncilNameKey,
    ]) {
      if (!key) continue;
      const v = rec[key];
      if (v !== null && v !== undefined && v !== '') parts.push(String(v));
    }
    if (parts.length > 0) return parts.join(' · ');
    return formatLocationObject(rec);
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return formatLocationObject(value as Record<string, unknown>);
  }
  return String(value);
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
  if (!formResponseJson || typeof formResponseJson !== 'object' || Array.isArray(formResponseJson)) {
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
