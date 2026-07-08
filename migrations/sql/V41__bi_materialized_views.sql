-- Export BI na VPS1 (ADR 0007 — fase 1).
-- Schema bi_export: MVs consolidadas para consumo via etl_user (FDW na VPS2).
-- Contrato de colunas alinhado a gds-analytics/sql/analytics/04-analytics-views.sql.
-- Filtro UNB: context.name ILIKE '%unb%' (contexto ativo).
-- Refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY bi_export.mv_* (índices UNIQUE abaixo).

CREATE SCHEMA IF NOT EXISTS bi_export;

-- Rascunho anterior (public), caso exista em ambiente de dev.
DROP MATERIALIZED VIEW IF EXISTS public.mv_bi_weekly_reports;
DROP MATERIALIZED VIEW IF EXISTS public.mv_bi_quiz_submissions;

DROP MATERIALIZED VIEW IF EXISTS bi_export.mv_reportes_semanal;
DROP MATERIALIZED VIEW IF EXISTS bi_export.mv_reportes;
DROP MATERIALIZED VIEW IF EXISTS bi_export.mv_quiz_dados;
DROP MATERIALIZED VIEW IF EXISTS bi_export.mv_participacao;

-- 1) Participações ativas no contexto UNB.
CREATE MATERIALIZED VIEW bi_export.mv_participacao AS
SELECT
  p.id                  AS participacao_id,
  p.user_id             AS usuario_id,
  p.context_id          AS contexto_id,
  c.name                AS contexto_nome,
  p.start_date          AS participacao_inicio,
  p.end_date            AS participacao_fim,
  p.active              AS participacao_ativo,
  p.created_at          AS participacao_criado_em,
  p.updated_at          AS participacao_atualizado_em,
  u.name                AS nome,
  u.email               AS email,
  u.external_identifier AS identificador_externo,
  u.active              AS usuario_ativo,
  u.created_at          AS usuario_criado_em,
  u.updated_at          AS usuario_atualizado_em,
  g.name                AS genero,
  l.id                  AS localizacao_id,
  l.name                AS localizacao_nome,
  l.latitude            AS localizacao_latitude,
  l.longitude           AS localizacao_longitude,
  r.code                AS papel_codigo,
  r.name                AS papel_nome,
  r.scope               AS papel_escopo
FROM participation p
JOIN "user" u ON u.id = p.user_id
JOIN context c ON c.id = p.context_id
LEFT JOIN gender g ON g.id = u.gender_id
LEFT JOIN location l ON l.id = u.location_id
LEFT JOIN role r ON r.id = u.role_id
WHERE p.active = true
  AND u.active = true
  AND c.active = true
  AND c.name ILIKE '%unb%';

CREATE UNIQUE INDEX bi_export_mv_participacao_participacao_id_idx
  ON bi_export.mv_participacao (participacao_id);

COMMENT ON MATERIALIZED VIEW bi_export.mv_participacao IS
  'Export participações UNB (contexto.nome ILIKE %unb%); REFRESH CONCURRENTLY na VPS1.';

-- 2) Quiz (participações em contexto UNB).
CREATE MATERIALIZED VIEW bi_export.mv_quiz_dados AS
SELECT
  q.id                    AS submissao_id,
  q.participation_id      AS participacao_id,
  q.form_version_id       AS formulario_versao_id,
  q.sequence_progress_id,
  q.quiz_response         AS resposta_quiz_json,
  q.question_results      AS resultados_por_questao_json,
  q.score                 AS pontuacao,
  q.percentage            AS percentual,
  q.is_passed             AS aprovado,
  q.attempt_number        AS numero_tentativa,
  q.time_spent_seconds    AS tempo_segundos,
  q.started_at            AS iniciado_em,
  q.completed_at          AS concluido_em,
  q.created_at            AS criado_em,
  q.updated_at            AS atualizado_em,
  q.active                AS ativo,
  p.user_id               AS usuario_id,
  p.context_id            AS contexto_id,
  c.name                  AS contexto_nome,
  p.start_date            AS participacao_inicio,
  p.end_date              AS participacao_fim,
  u.name                  AS usuario_nome,
  u.email                 AS usuario_email,
  f.id                    AS formulario_id,
  f.title                 AS formulario_titulo,
  f.reference             AS formulario_referencia,
  f.type                  AS formulario_tipo,
  fv.version_number       AS versao_numero,
  fv.passing_score        AS nota_corte,
  fv.max_attempts         AS max_tentativas,
  fv.time_limit_minutes   AS limite_minutos
FROM quiz_submission q
JOIN participation p ON p.id = q.participation_id
JOIN context c ON c.id = p.context_id
JOIN "user" u ON u.id = p.user_id
JOIN form_version fv ON fv.id = q.form_version_id
JOIN form f ON f.id = fv.form_id
WHERE q.active = true
  AND f.type = 'quiz'::form_type_enum
  AND c.active = true
  AND c.name ILIKE '%unb%';

CREATE UNIQUE INDEX bi_export_mv_quiz_dados_submissao_id_idx
  ON bi_export.mv_quiz_dados (submissao_id);

COMMENT ON MATERIALIZED VIEW bi_export.mv_quiz_dados IS
  'Export submissões quiz, contexto UNB; REFRESH CONCURRENTLY na VPS1.';

-- 3) Reportes linha a linha (contexto UNB).
CREATE MATERIALIZED VIEW bi_export.mv_reportes AS
SELECT
  r.id               AS reporte_id,
  r.participation_id AS participacao_id,
  r.form_version_id  AS formulario_versao_id,
  r.report_type::text AS tipo_reporte_codigo,
  CASE r.report_type::text
    WHEN 'NEGATIVE' THEN 'Reporte negativo (está mal)'
    WHEN 'POSITIVE' THEN 'Reporte positivo (está bem)'
    ELSE r.report_type::text
  END AS tipo_reporte_descricao,
  p.user_id          AS usuario_id,
  u.name             AS usuario_nome,
  u.email            AS usuario_email,
  p.context_id       AS contexto_id,
  c.name             AS contexto_nome,
  f.id               AS formulario_id,
  f.title            AS formulario_titulo,
  f.reference        AS formulario_referencia,
  fv.version_number  AS versao_numero,
  r.created_at       AS criado_em,
  r.updated_at       AS atualizado_em,
  r.active           AS ativo,
  CASE WHEN r.report_type::text = 'NEGATIVE' THEN r.occurrence_location ELSE NULL END AS local_ocorrencia,
  CASE WHEN r.report_type::text = 'NEGATIVE' THEN r.form_response ELSE NULL END       AS detalhes_formulario
FROM report r
JOIN participation p ON p.id = r.participation_id
JOIN context c ON c.id = p.context_id
JOIN "user" u ON u.id = p.user_id
JOIN form_version fv ON fv.id = r.form_version_id
JOIN form f ON f.id = fv.form_id
WHERE r.active = true
  AND c.active = true
  AND c.name ILIKE '%unb%';

CREATE UNIQUE INDEX bi_export_mv_reportes_reporte_id_idx
  ON bi_export.mv_reportes (reporte_id);

COMMENT ON MATERIALIZED VIEW bi_export.mv_reportes IS
  'Export reportes, contexto UNB; REFRESH CONCURRENTLY na VPS1.';

-- 4) Presença semanal agregada (contexto UNB) — complemento para painéis de frequência.
CREATE MATERIALIZED VIEW bi_export.mv_reportes_semanal AS
SELECT
  p.user_id             AS usuario_id,
  p.id                  AS participacao_id,
  u.external_identifier AS identificador_externo,
  (u.external_identifier ~ '^\d{9}$') AS matricula_unb_valida,
  (
    u.external_identifier IS NOT NULL
    AND btrim(u.external_identifier) <> ''
  ) AS tem_identificador,
  u.name                AS usuario_nome,
  p.context_id          AS contexto_id,
  c.name                AS contexto_nome,
  date_trunc(
    'week',
    timezone('America/Sao_Paulo', r.created_at)
  )::date AS semana_inicio,
  COUNT(*)::int AS quantidade_reportes
FROM report r
INNER JOIN participation p ON p.id = r.participation_id
INNER JOIN "user" u ON u.id = p.user_id
INNER JOIN context c ON c.id = p.context_id
WHERE r.active = true
  AND p.active = true
  AND c.active = true
  AND c.name ILIKE '%unb%'
GROUP BY
  p.user_id,
  p.id,
  u.external_identifier,
  u.name,
  p.context_id,
  c.name,
  date_trunc(
    'week',
    timezone('America/Sao_Paulo', r.created_at)
  )::date;

CREATE UNIQUE INDEX bi_export_mv_reportes_semanal_pk
  ON bi_export.mv_reportes_semanal (participacao_id, semana_inicio);

CREATE INDEX bi_export_mv_reportes_semanal_contexto_semana
  ON bi_export.mv_reportes_semanal (contexto_id, semana_inicio);

CREATE INDEX bi_export_mv_reportes_semanal_contexto_matricula
  ON bi_export.mv_reportes_semanal (contexto_id, matricula_unb_valida);

CREATE INDEX bi_export_mv_reportes_semanal_contexto_usuario
  ON bi_export.mv_reportes_semanal (contexto_id, usuario_id);

COMMENT ON MATERIALIZED VIEW bi_export.mv_reportes_semanal IS
  'Export presença semanal por participação (UNB); REFRESH CONCURRENTLY na VPS1.';

-- Leitura para FDW (etl_user na VPS1). Em dev local o role pode não existir.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'etl_user') THEN
    GRANT USAGE ON SCHEMA bi_export TO etl_user;
    GRANT SELECT ON bi_export.mv_participacao TO etl_user;
    GRANT SELECT ON bi_export.mv_quiz_dados TO etl_user;
    GRANT SELECT ON bi_export.mv_reportes TO etl_user;
    GRANT SELECT ON bi_export.mv_reportes_semanal TO etl_user;
  END IF;
END $$;
