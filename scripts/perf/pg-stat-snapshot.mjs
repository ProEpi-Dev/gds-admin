#!/usr/bin/env node
/**
 * Snapshot de pg_stat_statements + contadores de tabela.
 * Uso: node scripts/perf/pg-stat-snapshot.mjs [label]
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const label = process.argv[2] ?? 'snapshot';
const outDir = join(process.cwd(), 'scripts', 'perf', 'output');

function psql(sql) {
  return execFileSync(
    'docker',
    ['exec', 'gds-postgres', 'psql', '-U', 'gds_user', '-d', 'gds_db', '-c', sql],
    { encoding: 'utf8' },
  );
}

mkdirSync(outDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const file = join(outDir, `${ts}-${label}.txt`);

let out = `# PG snapshot: ${label}\n# ${new Date().toISOString()}\n\n`;

out += '=== pg_stat_statements (top 20 por total_exec_time) ===\n';
try {
  out += psql(`
    SELECT LEFT(query, 120) AS query,
           calls,
           ROUND(mean_exec_time::numeric, 2) AS mean_ms,
           ROUND(total_exec_time::numeric, 2) AS total_ms,
           rows
    FROM pg_stat_statements
    WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'gds_db')
      AND query NOT LIKE '%pg_stat_statements%'
    ORDER BY total_exec_time DESC
    LIMIT 20;
  `);
} catch (e) {
  out += `ERRO: ${e.stderr?.toString() ?? e.message}\n`;
}

out += '\n=== Filtro: participation_report / report_syndrome / report INSERT ===\n';
try {
  out += psql(`
    SELECT LEFT(query, 140) AS query,
           calls,
           ROUND(mean_exec_time::numeric, 2) AS mean_ms,
           ROUND(total_exec_time::numeric, 2) AS total_ms
    FROM pg_stat_statements
    WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'gds_db')
      AND (
        query ILIKE '%participation_report%'
        OR query ILIKE '%report_syndrome%'
        OR query ILIKE '%INSERT%report%'
        OR query ILIKE '%context_configuration%'
      )
    ORDER BY total_exec_time DESC
    LIMIT 25;
  `);
} catch (e) {
  out += `ERRO: ${e.stderr?.toString() ?? e.message}\n`;
}

out += '\n=== pg_stat_user_tables (report, streak, syndrome) ===\n';
out += psql(`
  SELECT relname, seq_scan, idx_scan, n_tup_ins, n_tup_upd, n_tup_del
  FROM pg_stat_user_tables
  WHERE relname IN (
    'report', 'participation_report_day', 'participation_report_streak',
    'report_syndrome_score', 'report_integration_event'
  )
  ORDER BY relname;
`);

writeFileSync(file, out);
console.log(`Snapshot salvo: ${file}`);
console.log(out);
