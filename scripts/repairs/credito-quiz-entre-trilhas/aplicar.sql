-- Correção única: credita itens de quiz com prazo vencido para quem já tinha aprovado
-- o mesmo formulário dentro do prazo (regra da A6, PR #114).
--
-- Efeito por item, igual ao complete-quiz:
--   sequence_progress -> status 'completed', completed_at = agora (cria o registro se faltar);
--   track_progress    -> percentual e status recalculados como em recalculateTrackProgress.
-- Antes de alterar, grava o estado anterior em manutencao.credito_quiz_20261010 (usado por reverter.sql).
--
-- Uso (a partir desta pasta):
--   ensaio, termina em ROLLBACK:  psql -v ON_ERROR_STOP=1 -f aplicar.sql
--   grava de verdade:             psql -v ON_ERROR_STOP=1 -v confirmar=1 -f aplicar.sql
--   escopo maior:                 acrescente -v incluir_nao_marcados=1 (ver escopo.sql)
BEGIN;

\i candidatos.sql
\i escopo.sql

CREATE SCHEMA IF NOT EXISTS manutencao;

CREATE TABLE manutencao.credito_quiz_20261010 AS
SELECT
  c.track_progress_id,
  c.participation_id,
  c.track_cycle_id,
  c.sequence_id,
  c.form_id,
  c.win_start,
  c.win_end,
  c.quiz_submission_id,
  c.credit_day,
  c.sequence_progress_id   AS sp_id_antes,
  sp.status                AS sp_status_antes,
  sp.completed_at          AS sp_completed_at_antes,
  sp.updated_at            AS sp_updated_at_antes,
  tp.status                AS tp_status_antes,
  tp.progress_percentage   AS tp_percentage_antes,
  tp.completed_at          AS tp_completed_at_antes,
  tp.updated_at            AS tp_updated_at_antes,
  now() AT TIME ZONE 'UTC' AS aplicado_em
FROM credito_quiz_candidatos c
JOIN track_progress tp         ON tp.id = c.track_progress_id
LEFT JOIN sequence_progress sp ON sp.id = c.sequence_progress_id;

-- 1. Marca os itens como concluídos
INSERT INTO sequence_progress (track_progress_id, sequence_id, status, completed_at, visits_count, created_at, updated_at)
SELECT track_progress_id, sequence_id, 'completed', aplicado_em, 0, aplicado_em, aplicado_em
FROM manutencao.credito_quiz_20261010
ON CONFLICT (track_progress_id, sequence_id) DO UPDATE
  SET status       = 'completed',
      completed_at = EXCLUDED.completed_at,
      updated_at   = EXCLUDED.updated_at;

-- 2. Recalcula as trilhas afetadas (itens ativos de seções ativas)
WITH itens_ativos AS (
  SELECT tp.id AS track_progress_id, sq.id AS sequence_id
  FROM track_progress tp
  JOIN track_cycle tc ON tc.id = tp.track_cycle_id
  JOIN section s      ON s.track_id = tc.track_id AND s.active
  JOIN sequence sq    ON sq.section_id = s.id AND sq.active
  WHERE tp.id IN (SELECT track_progress_id FROM manutencao.credito_quiz_20261010)
),
contagem AS (
  SELECT ia.track_progress_id,
         count(*) AS total,
         count(*) FILTER (WHERE sp.status = 'completed') AS feitos
  FROM itens_ativos ia
  LEFT JOIN sequence_progress sp
         ON sp.track_progress_id = ia.track_progress_id AND sp.sequence_id = ia.sequence_id
  GROUP BY ia.track_progress_id
)
UPDATE track_progress tp
SET progress_percentage = round(ct.feitos * 100.0 / ct.total, 2),
    status = CASE WHEN ct.feitos = ct.total THEN 'completed'::progress_status_enum
                  WHEN ct.feitos > 0 THEN 'in_progress'::progress_status_enum
                  ELSE tp.status END,
    completed_at = CASE WHEN ct.feitos = ct.total
                        THEN COALESCE(tp.completed_at, now() AT TIME ZONE 'UTC')
                        ELSE tp.completed_at END,
    updated_at = now() AT TIME ZONE 'UTC'
FROM contagem ct
WHERE tp.id = ct.track_progress_id
  AND ct.total > 0;

\echo '== Conferência'
SELECT
  (SELECT count(*) FROM manutencao.credito_quiz_20261010) AS itens_creditados,
  (SELECT count(*) FROM manutencao.credito_quiz_20261010 m
     JOIN sequence_progress sp ON sp.track_progress_id = m.track_progress_id AND sp.sequence_id = m.sequence_id
    WHERE sp.status = 'completed') AS itens_concluidos_agora;

\echo '== Status das trilhas afetadas (antes -> depois)'
SELECT a.tp_status_antes AS antes, tp.status AS depois, count(*) AS trilhas
FROM (SELECT DISTINCT track_progress_id, tp_status_antes FROM manutencao.credito_quiz_20261010) a
JOIN track_progress tp ON tp.id = a.track_progress_id
GROUP BY 1, 2
ORDER BY 1, 2;

\echo '== Candidatos restantes no escopo (deve ser 0)'
DROP TABLE credito_quiz_candidatos;
\i candidatos.sql
\i escopo.sql
SELECT count(*) AS restantes FROM credito_quiz_candidatos;

\if :{?confirmar}
  \echo '>> COMMIT'
  COMMIT;
\else
  \echo '>> ROLLBACK (ensaio; use -v confirmar=1 para gravar)'
  ROLLBACK;
\endif
