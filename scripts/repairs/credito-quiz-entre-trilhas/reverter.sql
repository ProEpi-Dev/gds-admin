-- Desfaz aplicar.sql a partir de manutencao.credito_quiz_20261010.
-- Só reverte linhas que não mudaram depois da correção (updated_at igual ao da aplicação);
-- as que o participante alterou depois são listadas e mantidas.
--
-- Uso (a partir desta pasta):
--   ensaio, termina em ROLLBACK:  psql -v ON_ERROR_STOP=1 -f reverter.sql
--   grava de verdade:             psql -v ON_ERROR_STOP=1 -v confirmar=1 -f reverter.sql
BEGIN;

\echo '== Itens alterados depois da correção (mantidos)'
SELECT m.track_progress_id, m.sequence_id, sp.status, sp.updated_at
FROM manutencao.credito_quiz_20261010 m
JOIN sequence_progress sp ON sp.track_progress_id = m.track_progress_id AND sp.sequence_id = m.sequence_id
WHERE sp.updated_at <> m.aplicado_em;

-- Registros criados pela correção
DELETE FROM sequence_progress sp
USING manutencao.credito_quiz_20261010 m
WHERE m.sp_id_antes IS NULL
  AND sp.track_progress_id = m.track_progress_id
  AND sp.sequence_id = m.sequence_id
  AND sp.updated_at = m.aplicado_em;

-- Registros que já existiam
UPDATE sequence_progress sp
SET status = m.sp_status_antes,
    completed_at = m.sp_completed_at_antes,
    updated_at = m.sp_updated_at_antes
FROM manutencao.credito_quiz_20261010 m
WHERE m.sp_id_antes = sp.id
  AND sp.updated_at = m.aplicado_em;

-- Trilhas (só as que não mudaram de novo depois da correção)
UPDATE track_progress tp
SET status = a.tp_status_antes,
    progress_percentage = a.tp_percentage_antes,
    completed_at = a.tp_completed_at_antes,
    updated_at = a.tp_updated_at_antes
FROM (SELECT DISTINCT track_progress_id, tp_status_antes, tp_percentage_antes,
                      tp_completed_at_antes, tp_updated_at_antes, aplicado_em
      FROM manutencao.credito_quiz_20261010) a
WHERE tp.id = a.track_progress_id
  AND tp.updated_at = a.aplicado_em;

\echo '== Itens ainda concluídos após reverter'
SELECT count(*) AS ainda_concluidos
FROM manutencao.credito_quiz_20261010 m
JOIN sequence_progress sp ON sp.track_progress_id = m.track_progress_id AND sp.sequence_id = m.sequence_id
WHERE sp.status = 'completed';

\if :{?confirmar}
  \echo '>> COMMIT'
  COMMIT;
\else
  \echo '>> ROLLBACK (ensaio; use -v confirmar=1 para gravar)'
  ROLLBACK;
\endif
