-- Itens de quiz com prazo vencido que a regra da A6 (PR #114) aceitaria concluir.
-- Mesma regra do complete-quiz:
--   janela = ciclo, recortado pelo agendamento da seção e depois pelo do item;
--   prazo vencido = hoje (São Paulo) depois do último dia da janela;
--   crédito = aprovação da mesma participação, no mesmo formulário (qualquer versão),
--             concluída até o último dia da janela (dia civil em São Paulo).
-- Só leitura. Usado pelo dry-run e pela correção (aplicar.sql).

CREATE TEMP TABLE credito_quiz_candidatos ON COMMIT DROP AS
WITH janela_secao AS (
  SELECT
    tp.id               AS track_progress_id,
    tp.participation_id,
    tc.id               AS track_cycle_id,
    tc.track_id,
    tc.status           AS cycle_status,
    sq.id               AS sequence_id,
    sq.form_id,
    GREATEST(tc.start_date, COALESCE(ss.start_date, tc.start_date)) AS sec_start,
    LEAST(tc.end_date, COALESCE(ss.end_date, tc.end_date))          AS sec_end,
    qs.start_date AS seq_start_override,
    qs.end_date   AS seq_end_override
  FROM track_progress tp
  JOIN track_cycle tc ON tc.id = tp.track_cycle_id
  JOIN section s      ON s.track_id = tc.track_id AND s.active
  JOIN sequence sq    ON sq.section_id = s.id AND sq.active AND sq.form_id IS NOT NULL
  LEFT JOIN track_cycle_section_schedule ss
         ON ss.track_cycle_id = tc.id AND ss.section_id = s.id
  LEFT JOIN track_cycle_sequence_schedule qs
         ON qs.track_cycle_id = tc.id AND qs.sequence_id = sq.id
),
janela_item AS (
  SELECT
    j.*,
    GREATEST(j.sec_start, COALESCE(j.seq_start_override, j.sec_start)) AS win_start,
    LEAST(j.sec_end, COALESCE(j.seq_end_override, j.sec_end))          AS win_end
  FROM janela_secao j
  WHERE j.sec_start <= j.sec_end
),
vencidos AS (
  SELECT ji.*, sp.id AS sequence_progress_id, sp.status AS sp_status
  FROM janela_item ji
  LEFT JOIN sequence_progress sp
         ON sp.track_progress_id = ji.track_progress_id AND sp.sequence_id = ji.sequence_id
  WHERE ji.win_start <= ji.win_end
    AND (now() AT TIME ZONE 'America/Sao_Paulo')::date > ji.win_end
    AND (sp.id IS NULL OR sp.status <> 'completed')
),
primeira_aprovacao AS (
  -- Aprovação mais antiga do mesmo formulário pela mesma participação
  SELECT DISTINCT ON (v.track_progress_id, v.sequence_id)
    v.*,
    q.id AS quiz_submission_id,
    ((COALESCE(q.completed_at, q.created_at) AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date AS credit_day
  FROM vencidos v
  JOIN form_version fv    ON fv.form_id = v.form_id
  JOIN quiz_submission q  ON q.form_version_id = fv.id
                         AND q.participation_id = v.participation_id
                         AND q.is_passed = true
                         AND q.active
  ORDER BY v.track_progress_id, v.sequence_id, COALESCE(q.completed_at, q.created_at), q.id
)
SELECT *
FROM primeira_aprovacao
WHERE credit_day <= win_end;
