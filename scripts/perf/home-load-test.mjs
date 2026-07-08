#!/usr/bin/env node
/**
 * Teste de performance: N usuários simultâneos simulando carga do app mobile
 * (home + conteúdos + trilhas + mapa duplicado).
 *
 * Uso:
 *   node scripts/perf/home-load-test.mjs
 *   PERF_CONCURRENCY=15 PERF_PASSWORD=senha node scripts/perf/home-load-test.mjs
 *
 * Pré-requisitos: backend rodando (yarn start:dev), PostgreSQL acessível se usar auto-discovery.
 *
 * Variáveis:
 *   API_BASE_URL     default http://localhost:3000/v1
 *   PERF_CONCURRENCY default 150
 *   PERF_CHANNEL     default app (x-gds-channel)
 *   PERF_PASSWORD    senha dos usuários de teste (obrigatória)
 *   PERF_EMAILS      emails separados por vírgula (opcional; senão busca no banco)
 *   DATABASE_URL     default postgresql://gds_user:gds_password@localhost:5432/gds_db
 *   PERF_ROUNDS      default 1 (repetições do cenário completo)
 *   PERF_MAX_CYCLES  default 5 (máx. chamadas track-progress/cycle por usuário)
 */

import { execFileSync } from 'node:child_process';

function runPsql(sql) {
  return execFileSync(
    'docker',
    [
      'exec',
      'gds-postgres',
      'psql',
      '-U',
      'gds_user',
      '-d',
      'gds_db',
      '-t',
      '-A',
      '-F',
      '|',
      '-c',
      sql,
    ],
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  );
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function subDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000/v1';
const CONCURRENCY = Number(process.env.PERF_CONCURRENCY ?? 150);
const PASSWORD = process.env.PERF_PASSWORD ?? '';
const ROUNDS = Number(process.env.PERF_ROUNDS ?? 1);
const CHANNEL = process.env.PERF_CHANNEL ?? 'app';
const MAX_CYCLES = Number(process.env.PERF_MAX_CYCLES ?? 5);

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function summarize(label, durations, errors) {
  const ok = durations.filter((d) => d.ok);
  const times = ok.map((d) => d.ms).sort((a, b) => a - b);
  const failed = durations.length - ok.length;
  console.log(`\n── ${label} ──`);
  console.log(`  Requisições: ${durations.length} | OK: ${ok.length} | Falhas: ${failed}`);
  if (errors.length) {
    console.log(`  Erros: ${[...new Set(errors)].slice(0, 5).join(' | ')}`);
  }
  if (times.length === 0) return;
  const sum = times.reduce((a, b) => a + b, 0);
  console.log(
    `  Latência (ms): min=${times[0]} p50=${percentile(times, 50)} p95=${percentile(times, 95)} p99=${percentile(times, 99)} max=${times[times.length - 1]} avg=${(sum / times.length).toFixed(1)}`,
  );
}

async function fetchJson(path, { token, method = 'GET' } = {}) {
  const started = performance.now();
  const headers = {
    Accept: 'application/json',
    'x-gds-channel': CHANNEL,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method, headers });
  } catch (err) {
    return { ok: false, ms: performance.now() - started, status: 0, error: err.message };
  }

  const ms = performance.now() - started;
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, ms, status: res.status, error: body.slice(0, 120) };
  }
  const data = await res.json().catch(() => null);
  return { ok: true, ms, status: res.status, data };
}

async function login(email) {
  const started = performance.now();
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-gds-channel': CHANNEL,
    },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const ms = performance.now() - started;
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Login falhou (${email}): HTTP ${res.status} — ${body.slice(0, 100)}`);
  }
  const data = await res.json();
  return {
    ms,
    token: data.token,
    contextId: data.participation?.context?.id,
    participationId: data.participation?.id,
    email,
  };
}

function discoverHeavyUsersFromDb(limit) {
  const sql = `
    SELECT u.email,
           COUNT(DISTINCT r.id) AS reports,
           COUNT(DISTINCT tp.id) AS track_progress
    FROM public."user" u
    INNER JOIN participation p ON p.user_id = u.id AND p.active = true
    LEFT JOIN report r ON r.participation_id = p.id AND r.active = true
    LEFT JOIN track_progress tp ON tp.participation_id = p.id
    WHERE u.active = true
    GROUP BY u.id, u.email
    HAVING COUNT(DISTINCT r.id) > 0 AND COUNT(DISTINCT tp.id) > 0
    ORDER BY COUNT(DISTINCT r.id) DESC, COUNT(DISTINCT tp.id) DESC, u.email
    LIMIT ${limit}
  `
    .replace(/\s+/g, ' ')
    .trim();
  try {
    const out = runPsql(sql);
    return out
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [email, reports, trackProgress] = line.split('|');
        return {
          email,
          reports: Number(reports),
          trackProgress: Number(trackProgress),
        };
      });
  } catch {
    return [];
  }
}

function resolveEmails() {
  if (process.env.PERF_EMAILS) {
    return {
      users: process.env.PERF_EMAILS.split(',')
        .map((e) => e.trim())
        .filter(Boolean)
        .map((email) => ({ email })),
    };
  }
  const fromDb = discoverHeavyUsersFromDb(CONCURRENCY);
  if (fromDb.length >= CONCURRENCY) {
    return { users: fromDb.slice(0, CONCURRENCY) };
  }
  if (fromDb.length > 0) {
    const padded = [...fromDb];
    while (padded.length < CONCURRENCY) {
      padded.push(fromDb[padded.length % fromDb.length]);
    }
    return { users: padded.slice(0, CONCURRENCY) };
  }
  return {
    users: Array(CONCURRENCY).fill({ email: 'admin@example.com' }),
    fallback: true,
  };
}

async function runUserSession(session) {
  const { token, contextId, participationId } = session;
  const startDate = formatDate(subDays(new Date(), 7));
  const endDate = formatDate(new Date());
  const results = [];

  const burstEndpoints = [
    { name: 'profile-status', path: '/users/me/profile-status' },
    { name: 'participations', path: `/participations?contextId=${contextId}` },
    { name: 'forms/signal', path: `/forms?contextId=${contextId}&type=signal&page=1&pageSize=20&active=true` },
    { name: 'contents', path: `/contents?contextId=${contextId}` },
    { name: 'content-types', path: '/content-types' },
    { name: 'track-cycles', path: `/track-cycles?contextId=${contextId}` },
    {
      name: 'reports/points-1',
      path: `/reports/points?startDate=${startDate}&endDate=${endDate}`,
    },
    {
      name: 'reports/points-2',
      path: `/reports/points?startDate=${startDate}&endDate=${endDate}`,
    },
  ];

  const burst = await Promise.all(
    burstEndpoints.map(async (ep) => {
      const r = await fetchJson(ep.path, { token });
      return { ...r, name: ep.name };
    }),
  );
  results.push(...burst);

  const cyclesResult = burst.find((r) => r.name === 'track-cycles' && r.ok);
  const cycles = Array.isArray(cyclesResult?.data) ? cyclesResult.data : [];
  const cycleSlice = cycles.slice(0, MAX_CYCLES);

  if (cycleSlice.length > 0) {
    const cycleCalls = await Promise.all(
      cycleSlice.map(async (cycle) => {
        const r = await fetchJson(
          `/track-progress/participation/${participationId}/cycle/${cycle.id}`,
          { token },
        );
        return { ...r, name: `track-progress/cycle/${cycle.id}` };
      }),
    );
    results.push(...cycleCalls);
  }

  return results;
}

async function main() {
  if (!PASSWORD) {
    console.error('Defina PERF_PASSWORD com a senha dos usuários de teste.');
    console.error('Exemplo: PERF_PASSWORD=admin123 node scripts/perf/home-load-test.mjs');
    process.exit(1);
  }

  const { users, fallback } = resolveEmails();
  const emails = users.map((u) => u.email);
  console.log('GDS — teste de carga simulando app mobile (participante)');
  console.log(`API: ${API_BASE_URL} | Canal: ${CHANNEL}`);
  console.log(`Usuários simultâneos: ${CONCURRENCY} | Rodadas: ${ROUNDS}`);
  if (fallback) {
    console.log('Aviso: não foi possível ler usuários do banco; usando fallback admin@example.com');
  } else if (users[0]?.reports != null) {
    console.log('Usuários (reports | trilhas):');
    for (const u of users) {
      console.log(`  - ${u.email} (${u.reports} reports, ${u.trackProgress} track_progress)`);
    }
  } else {
    console.log(`Emails (${emails.length}): ${emails.join(', ')}`);
  }

  const health = await fetch(`${API_BASE_URL}/health`, {
    headers: { 'x-gds-channel': CHANNEL },
  }).catch(() => null);
  if (!health?.ok) {
    console.error(`Backend inacessível em ${API_BASE_URL}. Inicie com: cd backend && yarn start:dev`);
    process.exit(1);
  }

  const allByEndpoint = {};
  const loginDurations = [];
  const sessionDurations = [];
  const errors = [];

  for (let round = 1; round <= ROUNDS; round++) {
    if (ROUNDS > 1) console.log(`\n=== Rodada ${round}/${ROUNDS} ===`);

    const roundStart = performance.now();

    const sessions = await Promise.all(
      emails.map(async (email) => {
        try {
          return await login(email);
        } catch (err) {
          errors.push(err.message);
          return null;
        }
      }),
    );

    for (const s of sessions.filter(Boolean)) {
      loginDurations.push({ ok: true, ms: s.ms });
    }

    const activeSessions = sessions.filter(Boolean);
    if (activeSessions.length === 0) {
      console.error('Nenhum login bem-sucedido. Verifique PERF_PASSWORD e usuários.');
      process.exit(1);
    }

    const userResults = await Promise.all(activeSessions.map((s) => runUserSession(s)));

    for (const results of userResults) {
      for (const r of results) {
        if (!allByEndpoint[r.name]) allByEndpoint[r.name] = [];
        allByEndpoint[r.name].push({ ok: r.ok, ms: r.ms });
        if (!r.ok) errors.push(`${r.name}: HTTP ${r.status} ${r.error ?? ''}`);
      }
    }

    sessionDurations.push({ ok: true, ms: performance.now() - roundStart });
  }

  console.log('\n══════════ RESULTADOS ══════════');
  summarize('Login', loginDurations, errors.filter((e) => e.startsWith('Login')));
  for (const [name, durations] of Object.entries(allByEndpoint)) {
    summarize(name, durations, errors.filter((e) => e.startsWith(name)));
  }
  summarize('Sessão completa (login + endpoints/usuário)', sessionDurations, []);

  const totalRequests =
    loginDurations.length +
    Object.values(allByEndpoint).reduce((acc, arr) => acc + arr.length, 0);
  const totalOk =
    loginDurations.filter((d) => d.ok).length +
    Object.values(allByEndpoint)
      .flat()
      .filter((d) => d.ok).length;
  console.log(
    `\nTotal: ${totalOk}/${totalRequests} requisições OK (${CONCURRENCY} usuários × ${ROUNDS} rodada(s))`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
