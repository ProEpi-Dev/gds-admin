#!/usr/bin/env node
/**
 * Análise de possíveis gargalos no PostgreSQL para queries da home/conteúdos/trilhas.
 *
 * Uso: node scripts/perf/db-bottleneck-analysis.mjs
 *      DATABASE_URL=postgresql://... node scripts/perf/db-bottleneck-analysis.mjs
 */

import { execSync } from 'node:child_process';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://gds_user:gds_password@localhost:5432/gds_db';

const psqlUrl = DATABASE_URL.replace('localhost', 'host.docker.internal');

function runSql(title, sql) {
  console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`);
  try {
    const out = execSync(
      `docker run --rm --add-host=host.docker.internal:host-gateway postgres:16-alpine psql "${psqlUrl}" -c "${sql.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    process.stdout.write(out);
  } catch (err) {
    console.error('Falha ao executar query:', err.stderr?.toString() ?? err.message);
  }
}

console.log('GDS — análise de gargalos PostgreSQL');
console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

runSql(
  '1. Volume das tabelas principais',
  `SELECT 'report' AS t, COUNT(*) AS rows, pg_size_pretty(pg_total_relation_size('report')) AS size FROM report
   UNION ALL SELECT 'participation', COUNT(*), pg_size_pretty(pg_total_relation_size('participation')) FROM participation
   UNION ALL SELECT 'content', COUNT(*), pg_size_pretty(pg_total_relation_size('content')) FROM content
   UNION ALL SELECT 'track_cycle', COUNT(*), pg_size_pretty(pg_total_relation_size('track_cycle')) FROM track_cycle
   UNION ALL SELECT 'track_progress', COUNT(*), pg_size_pretty(pg_total_relation_size('track_progress')) FROM track_progress
   UNION ALL SELECT 'form', COUNT(*), pg_size_pretty(pg_total_relation_size('form')) FROM form;`,
);

runSql(
  '2. Seq scan vs index scan (tabelas da home)',
  `SELECT relname, seq_scan, idx_scan, seq_tup_read, n_live_tup
   FROM pg_stat_user_tables
   WHERE relname IN ('report','participation','content','track_cycle','track_progress','form','form_version')
   ORDER BY seq_scan DESC;`,
);

runSql(
  '3. EXPLAIN — mapa de pontos (findPoints, contexto 1, 7 dias)',
  `EXPLAIN (ANALYZE, BUFFERS)
   SELECT r.report_type::text, r.occurrence_location
   FROM report r
   INNER JOIN participation p ON p.id = r.participation_id
   WHERE r.active = true AND p.active = true AND p.context_id = 1
     AND r.created_at >= NOW() - INTERVAL '7 days' AND r.created_at <= NOW()
     AND r.occurrence_location IS NOT NULL
   ORDER BY r.created_at DESC LIMIT 500;`,
);

runSql(
  '4. EXPLAIN — mapa de pontos (janela ampla, contexto 1)',
  `EXPLAIN (ANALYZE, BUFFERS)
   SELECT r.report_type::text, r.occurrence_location
   FROM report r
   INNER JOIN participation p ON p.id = r.participation_id
   WHERE r.active = true AND p.active = true AND p.context_id = 1
     AND r.created_at >= '2025-01-01' AND r.created_at <= '2026-12-31'
     AND r.occurrence_location IS NOT NULL
   ORDER BY r.created_at DESC LIMIT 500;`,
);

runSql(
  '5. EXPLAIN — listagem de conteúdos',
  `EXPLAIN (ANALYZE, BUFFERS)
   SELECT c.id FROM content c
   WHERE c.context_id = 1 AND c.active = true AND c.track_exclusive = false
   ORDER BY c.updated_at DESC;`,
);

runSql(
  '6. EXPLAIN — ciclos de trilha por contexto',
  `EXPLAIN (ANALYZE, BUFFERS)
   SELECT tc.id FROM track_cycle tc
   WHERE tc.context_id = 1 ORDER BY tc.start_date DESC;`,
);

runSql(
  '7. EXPLAIN — trilhas obrigatórias (mandatory compliance)',
  `EXPLAIN (ANALYZE, BUFFERS)
   SELECT tc.id, tc.mandatory_slug FROM track_cycle tc
   WHERE tc.context_id = 1 AND tc.status = 'active' AND tc.active = true
     AND tc.mandatory_slug IS NOT NULL
     AND tc.start_date <= CURRENT_DATE AND tc.end_date >= CURRENT_DATE
   ORDER BY tc.start_date DESC;`,
);

runSql(
  '8. Índices em report (mapa de pontos)',
  `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'report' ORDER BY indexname;`,
);

runSql(
  '9. Reports com localização por contexto (últimos 7 dias vs total)',
  `SELECT p.context_id,
          COUNT(*) FILTER (WHERE r.created_at >= NOW() - INTERVAL '7 days') AS last_7d,
          COUNT(*) AS total_with_location
   FROM report r
   JOIN participation p ON p.id = r.participation_id
   WHERE r.active = true AND r.occurrence_location IS NOT NULL
   GROUP BY p.context_id ORDER BY total_with_location DESC LIMIT 5;`,
);

console.log('\n── Recomendações (interpretação) ──');
console.log('- findPoints: se o plano usa idx_report_active_created_at_participation e filtra context_id no JOIN,');
console.log('  considere índice composto ou reescrever para filtrar participations do contexto primeiro.');
console.log('- content: seq scan é aceitável com poucas linhas; em escala, índice (context_id, active, track_exclusive).');
console.log('- track_progress/my-progress: includes profundos no Prisma — monitorar tempo com muitos registros.');
console.log('- mv_bi_*: views materializadas grandes; refresh agendado pode competir por I/O.');
