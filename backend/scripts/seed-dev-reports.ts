/**
 * Gera reports sintéticos para desenvolvimento.
 *
 * Varre apenas o array de sintomas no `form_response` (ex.: `sintomas: ["febre", "tosse"]`)
 * usando os códigos canônicos de `migrations/sql/V34__seed_syndromic_initial_weights.sql`.
 * Não consulta `syndrome_form_config` — combinações aleatórias bastam para exercitar o motor.
 */
import 'dotenv/config';
import { Prisma, PrismaClient, report_type_enum } from '@prisma/client';

type CliOptions = {
  count: number;
  startDate: string;
  endDate: string;
  positiveRatio: number;
  dryRun: boolean;
};

type TemplateReport = {
  id: number;
  participation_id: number;
  form_version_id: number;
  form_response: unknown;
  form_version: {
    form_id: number;
  };
};

/** Mesmo formato do app: `{ latitude, longitude }` (WGS-84). */
type OccurrenceLocation = { latitude: number; longitude: number };

/**
 * Pontos em cidades brasileiras fora do DF (evita coincidir com Brasília ao testar mapas).
 * Precisão similar a valores reais de GPS.
 */
const DEV_OCCURRENCE_LOCATIONS: readonly OccurrenceLocation[] = [
  { latitude: -23.55019331132271, longitude: -46.63306300358705 }, // São Paulo — SP
  { latitude: -22.90619331132271, longitude: -43.17206300358705 }, // Rio de Janeiro — RJ
  { latitude: -12.97119331132271, longitude: -38.50106300358705 }, // Salvador — BA
  { latitude: -19.91619331132271, longitude: -43.93406300358705 }, // Belo Horizonte — MG
  { latitude: -8.04719331132271, longitude: -34.87706300358705 }, // Recife — PE
  { latitude: -25.42819331132271, longitude: -49.27306300358705 }, // Curitiba — PR
  { latitude: -30.03419331132271, longitude: -51.21706300358705 }, // Porto Alegre — RS
  { latitude: -3.11919331132271, longitude: -60.02106300358705 }, // Manaus — AM
  { latitude: -1.45519331132271, longitude: -48.50406300358705 }, // Belém — PA
  { latitude: -3.71719331132271, longitude: -38.54306300358705 }, // Fortaleza — CE
];

/** Códigos de `symptom.code` em V34 (ordem igual à migration). */
const CANONICAL_SYMPTOM_CODES: readonly string[] = [
  'febre',
  'dor_garganta',
  'dor_cabeca',
  'mal_estar_enjoo',
  'tosse',
  'coriza',
  'dores_corpo',
  'dor_atras_olhos',
  'coceira_corpo',
  'fraqueza_tontura',
  'ganglios_linfaticos_inchados',
  'manchas_vermelhas_corpo',
  'dor_abdominal',
  'sangue_muco_fezes',
  'nausea_vomitos',
  'diarreia',
  'diminuicao_apetite',
  'olhos_vermelhos_lacrimejantes',
  'dor_ardencia_urinar',
  'bolhas_espinhas_descamacao_pele',
  'sangramento_olhos_gengiva_nariz',
  'urina_turva',
  'ferida_verruga_genital',
  'corrimento_genital',
  'ardencia_coceira_olhos',
  'dor_sangramento_relacao_sexual',
  'sangramento_urina',
  'coceira_regiao_genital',
];

const prisma = new PrismaClient();

function parseArgs(argv: string[]): CliOptions {
  const defaults: CliOptions = {
    count: 200,
    startDate: '2025-11-01',
    endDate: '2026-04-30',
    positiveRatio: 0.8,
    dryRun: false,
  };

  const next = { ...defaults };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      next.dryRun = true;
      continue;
    }
    if (arg.startsWith('--count=')) {
      next.count = Number(arg.split('=')[1] ?? defaults.count);
      continue;
    }
    if (arg.startsWith('--start=')) {
      next.startDate = String(arg.split('=')[1] ?? defaults.startDate);
      continue;
    }
    if (arg.startsWith('--end=')) {
      next.endDate = String(arg.split('=')[1] ?? defaults.endDate);
      continue;
    }
    if (arg.startsWith('--positive-ratio=')) {
      next.positiveRatio = Number(
        arg.split('=')[1] ?? defaults.positiveRatio.toString(),
      );
      continue;
    }
  }

  if (!Number.isFinite(next.count) || next.count < 1) {
    throw new Error('`--count` deve ser um inteiro maior que zero.');
  }
  if (!Number.isFinite(next.positiveRatio) || next.positiveRatio < 0 || next.positiveRatio > 1) {
    throw new Error('`--positive-ratio` deve estar no intervalo [0, 1].');
  }

  return next;
}

function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function randomDateBetween(startIso: string, endIso: string): Date {
  const start = new Date(`${startIso}T00:00:00.000Z`).getTime();
  const end = new Date(`${endIso}T23:59:59.999Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    throw new Error('Intervalo de datas inválido. Use --start=YYYY-MM-DD --end=YYYY-MM-DD.');
  }
  const ts = start + Math.floor(Math.random() * (end - start + 1));
  return new Date(ts);
}

function pickRandom<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function pickRandomOccurrenceLocation(): Prisma.InputJsonValue {
  return cloneJson(pickRandom([...DEV_OCCURRENCE_LOCATIONS])) as Prisma.InputJsonValue;
}

function sampleDistinctFromPool(pool: readonly string[], count: number): string[] {
  const copy = [...pool];
  const result: string[] = [];
  const n = Math.min(count, copy.length);
  while (copy.length > 0 && result.length < n) {
    const idx = randomInt(0, copy.length - 1);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

/** Combinações aleatórias de códigos canônicos (slugs iguais aos esperados pelo motor após mapeamento). */
function pickRandomSymptomCodes(isPositive: boolean): string[] {
  const pool = CANONICAL_SYMPTOM_CODES;
  if (!isPositive) {
    const n = randomInt(0, Math.min(2, pool.length));
    return sampleDistinctFromPool(pool, n);
  }
  const howMany = randomInt(1, Math.min(5, pool.length));
  return sampleDistinctFromPool(pool, howMany);
}

function normalizeResponseEntries(
  formResponse: unknown,
): Array<{ field: string; value: unknown }> {
  if (!formResponse) return [];
  if (Array.isArray(formResponse)) {
    return formResponse
      .map((entry: { field?: string; value?: unknown }) => ({
        field: String(entry?.field ?? ''),
        value: entry?.value,
      }))
      .filter((entry) => entry.field.length > 0);
  }
  if (typeof formResponse !== 'object') return [];
  const obj = formResponse as Record<string, unknown>;
  const answers = obj.answers;
  if (Array.isArray(answers)) {
    return answers
      .map((entry: { field?: string; value?: unknown }) => ({
        field: String(entry?.field ?? ''),
        value: entry?.value,
      }))
      .filter((entry) => entry.field.length > 0);
  }
  return Object.entries(obj)
    .filter(([key]) => key !== '_isValid')
    .map(([field, value]) => ({ field, value }));
}

function resolveSymptomsFieldKey(obj: Record<string, unknown>): string {
  if ('sintomas' in obj) return 'sintomas';
  if ('sintoma' in obj) return 'sintoma';
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_isValid') continue;
    if (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string')) {
      return k;
    }
  }
  return 'sintomas';
}

function applySintomasArrayToResponse(
  original: unknown,
  sintomas: string[],
  reportDate: Date,
): unknown {
  const ymd = reportDate.toISOString().slice(0, 10);
  const replacementAsText = sintomas.join(', ');

  if (Array.isArray(original)) {
    const next = original.map((entry: { field?: string; value?: unknown }) => {
      const field = String(entry?.field ?? '').toLowerCase();
      if (field !== 'sintomas' && field !== 'sintoma') return entry;
      return Array.isArray(entry?.value)
        ? { ...entry, value: sintomas }
        : { ...entry, value: replacementAsText };
    });
    const hit = next.some((e: { field?: string }) =>
      ['sintomas', 'sintoma'].includes(String(e?.field ?? '').toLowerCase()),
    );
    if (!hit) {
      next.push({ field: 'sintomas', value: sintomas });
    }
    return next;
  }

  if (typeof original === 'object' && original !== null) {
    const obj = { ...(original as Record<string, unknown>) };

    if (Array.isArray(obj.answers)) {
      const answers = obj.answers as Array<{ field?: string; value?: unknown }>;
      let replaced = false;
      obj.answers = answers.map((entry) => {
        const field = String(entry?.field ?? '').toLowerCase();
        if (field !== 'sintomas' && field !== 'sintoma') return entry;
        replaced = true;
        return Array.isArray(entry?.value)
          ? { ...entry, value: sintomas }
          : { ...entry, value: replacementAsText };
      });
      if (!replaced) {
        (obj.answers as unknown[]).push({ field: 'sintomas', value: sintomas });
      }
    } else {
      const key = resolveSymptomsFieldKey(obj);
      obj[key] = sintomas;
    }

    if (!Array.isArray(obj.answers)) {
      obj.data_inicio_sintoma = ymd;
    }
    return obj;
  }

  return original;
}

async function loadTemplateReports(): Promise<TemplateReport[]> {
  const rows = await prisma.report.findMany({
    where: { active: true },
    orderBy: { id: 'desc' },
    take: 100,
    select: {
      id: true,
      participation_id: true,
      form_version_id: true,
      form_response: true,
      form_version: {
        select: { form_id: true },
      },
    },
  });

  if (rows.length === 0) {
    console.log(
      '[seed-dev-reports] Nenhum report existente; usando template sintético mínimo (só FK + estrutura).',
    );
    return [await loadSyntheticTemplateReport()];
  }
  return rows as unknown as TemplateReport[];
}

async function loadSyntheticTemplateReport(): Promise<TemplateReport> {
  const fv = await prisma.form_version.findFirst({
    where: { active: true },
    orderBy: { version_number: 'desc' },
    select: { id: true, form_id: true },
  });

  if (!fv) {
    throw new Error(
      'Nenhuma form_version ativa. Cadastre formulário/versão antes do seed.',
    );
  }

  const part = await prisma.participation.findFirst({
    where: { active: true },
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  if (!part) {
    throw new Error(
      'Nenhuma participation ativa. Crie ao menos uma participação antes do seed.',
    );
  }

  const form_response: Record<string, unknown> = {
    sintomas: [],
    servico_hospitalar: 'nao',
    data_inicio_sintoma: '2020-01-01',
    contato_com_sintomaticos: 'nao',
  };

  return {
    id: 0,
    participation_id: part.id,
    form_version_id: fv.id,
    form_response,
    form_version: { form_id: fv.form_id },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const templates = await loadTemplateReports();

  let generatedPositive = 0;
  let generatedNegative = 0;

  const payload = Array.from({ length: options.count }).map(() => {
    const template = pickRandom(templates);
    const createdAt = randomDateBetween(options.startDate, options.endDate);
    const isPositive = Math.random() <= options.positiveRatio;
    const reportType = isPositive
      ? report_type_enum.POSITIVE
      : report_type_enum.NEGATIVE;

    if (isPositive) generatedPositive += 1;
    else generatedNegative += 1;

    const sintomas = pickRandomSymptomCodes(isPositive);
    const formResponseBase = cloneJson(template.form_response);
    const mutatedFormResponse = applySintomasArrayToResponse(
      formResponseBase,
      sintomas,
      createdAt,
    );

    return {
      participation_id: template.participation_id,
      form_version_id: template.form_version_id,
      report_type: reportType,
      occurrence_location: pickRandomOccurrenceLocation(),
      form_response: mutatedFormResponse as Prisma.InputJsonValue,
      active: true,
      created_at: createdAt,
      updated_at: createdAt,
    };
  });

  if (options.dryRun) {
    const samples = payload.slice(0, 5).map((row) => ({
      report_type: row.report_type,
      occurrence_location: row.occurrence_location,
      sintomas:
        typeof row.form_response === 'object' &&
        row.form_response !== null &&
        'sintomas' in row.form_response
          ? (row.form_response as { sintomas: unknown }).sintomas
          : null,
      data_inicio_sintoma:
        typeof row.form_response === 'object' &&
        row.form_response !== null &&
        'data_inicio_sintoma' in row.form_response
          ? (row.form_response as { data_inicio_sintoma: unknown })
              .data_inicio_sintoma
          : null,
    }));
    console.log('[dry-run] Nenhum insert realizado.');
    console.log(JSON.stringify({ samples, canonicalSymptomCount: CANONICAL_SYMPTOM_CODES.length }, null, 2));
    return;
  }

  await prisma.report.createMany({ data: payload });

  console.log(
    JSON.stringify(
      {
        inserted: payload.length,
        generatedPositive,
        generatedNegative,
        range: { start: options.startDate, end: options.endDate },
        templateReportsUsed: templates.length,
        symptomCodesInPool: CANONICAL_SYMPTOM_CODES.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('[seed-dev-reports] erro:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
