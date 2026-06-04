#!/usr/bin/env node
/**
 * Simula pico matinal de POST /reports (~15 req/s), como o envio BEM/MAL
 * do formulário "Estou sentindo ..." (form_id 10).
 *
 * Uso:
 *   PERF_PASSWORD=12345678As node scripts/perf/report-peak-load-test.mjs
 *
 * Variáveis:
 *   API_BASE_URL      default http://localhost:3000/v1
 *   PERF_PASSWORD     obrigatória
 *   PERF_RPS          default 15 (requisições por segundo)
 *   PERF_DURATION_SEC default 30
 *   PERF_USER_POOL    default 200 (usuários distintos no pool)
 *   REPORT_TYPE       POSITIVE | NEGATIVE (default POSITIVE = botão BEM)
 *   FORM_VERSION_ID   default auto (última versão ativa do form 10)
 */

import { execFileSync } from 'node:child_process';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000/v1';
const PASSWORD = process.env.PERF_PASSWORD ?? '';
const RPS = Number(process.env.PERF_RPS ?? 15);
const DURATION_SEC = Number(process.env.PERF_DURATION_SEC ?? 30);
const USER_POOL = Number(process.env.PERF_USER_POOL ?? 200);
const REPORT_TYPE = process.env.REPORT_TYPE ?? 'POSITIVE';
const CHANNEL = 'web';

function runPsql(sql) {
  return execFileSync(
    'docker',
    ['exec', 'gds-postgres', 'psql', '-U', 'gds_user', '-d', 'gds_db', '-t', '-A', '-c', sql],
    { encoding: 'utf8' },
  );
}

function discoverUserEmails(limit) {
  const sql = `SELECT u.email FROM public."user" u INNER JOIN participation p ON p.user_id = u.id AND p.active = true WHERE u.active = true ORDER BY RANDOM() LIMIT ${limit}`;
  return runPsql(sql)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function resolveFormVersionId() {
  if (process.env.FORM_VERSION_ID) return Number(process.env.FORM_VERSION_ID);
  const id = runPsql(
    'SELECT fv.id FROM form_version fv JOIN form f ON f.id = fv.form_id WHERE f.id = 10 AND fv.active = true ORDER BY fv.id DESC LIMIT 1',
  ).trim();
  return Number(id);
}

async function login(email) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-gds-channel': CHANNEL,
    },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login ${email}: ${res.status}`);
  const data = await res.json();
  if (!data.participation?.id || !data.participation?.context?.id) {
    throw new Error(`login ${email}: sem participação ativa`);
  }
  return {
    email,
    token: data.token,
    participationId: data.participation.id,
    contextId: data.participation.context.id,
  };
}

async function createReport(session, formVersionId) {
  const started = performance.now();
  const body = {
    participationId: session.participationId,
    formVersionId,
    reportType: REPORT_TYPE,
    formResponse: REPORT_TYPE === 'NEGATIVE' ? { sintomas: ['febre', 'tosse'] } : null,
    active: true,
  };

  const res = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-gds-channel': CHANNEL,
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify(body),
  });

  const ms = performance.now() - started;
  const text = await res.text().catch(() => '');
  return { ok: res.ok, ms, status: res.status, dedup: res.ok && text.includes('"id"') };
}

async function loginPool(emails, concurrency = 20) {
  const sessions = [];
  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (email) => {
        try {
          return await login(email);
        } catch {
          return null;
        }
      }),
    );
    sessions.push(...results.filter(Boolean));
    process.stdout.write(`\r  Logins: ${sessions.length}/${emails.length}`);
  }
  console.log('');
  return sessions;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function main() {
  if (!PASSWORD) {
    console.error('Defina PERF_PASSWORD');
    process.exit(1);
  }

  const formVersionId = resolveFormVersionId();
  console.log('GDS — simulação de pico POST /reports');
  console.log(`API: ${API_BASE_URL} | ${RPS} req/s × ${DURATION_SEC}s | tipo=${REPORT_TYPE} | form_version=${formVersionId}`);

  const health = await fetch(`${API_BASE_URL}/health`, { headers: { 'x-gds-channel': CHANNEL } });
  if (!health.ok) {
    console.error('Backend inacessível');
    process.exit(1);
  }

  console.log(`Carregando pool de ${USER_POOL} usuários...`);
  const emails = discoverUserEmails(USER_POOL);
  const sessions = await loginPool(emails);
  if (sessions.length === 0) {
    console.error('Nenhum login OK');
    process.exit(1);
  }
  console.log(`Pool ativo: ${sessions.length} sessões`);

  const total = RPS * DURATION_SEC;
  const intervalMs = 1000 / RPS;
  const latencies = [];
  let ok = 0;
  let fail = 0;
  let sessionIdx = 0;

  console.log(`Disparando ${total} requisições...`);
  const testStart = performance.now();

  const pending = [];
  for (let i = 0; i < total; i++) {
    const session = sessions[sessionIdx % sessions.length];
    sessionIdx += 1;

    pending.push(
      createReport(session, formVersionId).then((r) => {
        latencies.push(r.ms);
        if (r.ok) ok += 1;
        else fail += 1;
      }),
    );

    if (i < total - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  await Promise.all(pending);
  const elapsed = (performance.now() - testStart) / 1000;
  const times = latencies.sort((a, b) => a - b);

  console.log('\n── Resultado HTTP ──');
  console.log(`  Total: ${ok + fail} | OK: ${ok} | Falhas: ${fail}`);
  console.log(`  Duração real: ${elapsed.toFixed(1)}s (${((ok + fail) / elapsed).toFixed(1)} req/s)`);
  if (times.length) {
    console.log(
      `  Latência ms: min=${times[0].toFixed(0)} p50=${percentile(times, 50).toFixed(0)} p95=${percentile(times, 95).toFixed(0)} max=${times[times.length - 1].toFixed(0)} avg=${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(0)}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
