-- Dry-run: lista o que a correção faria, sem gravar nada (termina em ROLLBACK;
-- a única escrita é a tabela temporária dos candidatos).
-- Uso: psql -v ON_ERROR_STOP=1 -f dry-run.sql (a partir desta pasta)
--      com -v incluir_nao_marcados=1 para o escopo maior (ver escopo.sql)
BEGIN;

\i candidatos.sql
\i escopo.sql

\echo '== Itens a creditar, por trilha/ciclo/item'
SELECT c.track_id, t.name AS trilha, c.track_cycle_id, c.cycle_status, c.sequence_id, c.form_id,
       c.win_start, c.win_end,
       CASE WHEN c.credit_day < c.win_start THEN 'antes da janela' ELSE 'dentro da janela' END AS aprovacao,
       count(*)                                                   AS itens,
       count(*) FILTER (WHERE c.sequence_progress_id IS NULL)     AS sem_registro,
       count(*) FILTER (WHERE c.sequence_progress_id IS NOT NULL) AS registro_incompleto,
       min(c.credit_day) AS aprovacao_mais_antiga,
       max(c.credit_day) AS aprovacao_mais_recente
FROM credito_quiz_candidatos c
JOIN track t ON t.id = c.track_id
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
ORDER BY 1, 3, 5;

\echo '== Totais'
SELECT count(*)                          AS itens,
       count(DISTINCT track_progress_id) AS trilhas_afetadas,
       count(DISTINCT participation_id)  AS participacoes
FROM credito_quiz_candidatos;

\echo '== Efeito no status das trilhas afetadas (antes -> depois)'
WITH itens_ativos AS (
  SELECT tp.id AS track_progress_id, sq.id AS sequence_id
  FROM track_progress tp
  JOIN track_cycle tc ON tc.id = tp.track_cycle_id
  JOIN section s      ON s.track_id = tc.track_id AND s.active
  JOIN sequence sq    ON sq.section_id = s.id AND sq.active
  WHERE tp.id IN (SELECT track_progress_id FROM credito_quiz_candidatos)
),
contagem AS (
  SELECT ia.track_progress_id,
         count(*) AS total,
         count(*) FILTER (WHERE sp.status = 'completed' OR c.sequence_id IS NOT NULL) AS feitos_depois
  FROM itens_ativos ia
  LEFT JOIN sequence_progress sp
         ON sp.track_progress_id = ia.track_progress_id AND sp.sequence_id = ia.sequence_id
  LEFT JOIN credito_quiz_candidatos c
         ON c.track_progress_id = ia.track_progress_id AND c.sequence_id = ia.sequence_id
  GROUP BY ia.track_progress_id
)
SELECT tp.status AS status_antes,
       CASE WHEN ct.feitos_depois = ct.total THEN 'completed'
            WHEN ct.feitos_depois > 0 THEN 'in_progress'
            ELSE tp.status::text END AS status_depois,
       count(*) AS trilhas
FROM contagem ct
JOIN track_progress tp ON tp.id = ct.track_progress_id
GROUP BY 1, 2
ORDER BY 1, 2;

ROLLBACK;
