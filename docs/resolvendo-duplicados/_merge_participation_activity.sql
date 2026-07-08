-- Função auxiliar usada por merge_duplicate_users quando há colisão de
-- participations no mesmo contexto (mesmo user_id + context_id).
--
-- Histórico: criada manualmente em produção. Não faz parte das migrations Flyway.
-- Referência para manutenção e eventual remoção futura.

CREATE OR REPLACE FUNCTION public._merge_participation_activity(
  p_dup_part_id integer,
  p_canon_part_id integer
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    v_dup_tp_id   INT;
    v_canon_tp_id INT;
BEGIN
    -- 1) track_progress: resolver colisoes por (participation, track_cycle)
    FOR v_dup_tp_id, v_canon_tp_id IN
        SELECT tp_dup.id, tp_canon.id
          FROM track_progress tp_dup
          JOIN track_progress tp_canon
            ON tp_canon.participation_id = p_canon_part_id
           AND tp_canon.track_cycle_id   = tp_dup.track_cycle_id
         WHERE tp_dup.participation_id = p_dup_part_id
    LOOP
        -- Decide vencedor
        IF (SELECT progress_percentage FROM track_progress WHERE id = v_dup_tp_id)
           > (SELECT progress_percentage FROM track_progress WHERE id = v_canon_tp_id)
        THEN
            -- duplicado vence: troca papeis (canonico vira perdedor)
            -- Religar quiz_submissions do canonico (perdedor agora) para o vencedor
            UPDATE quiz_submission qs
               SET sequence_progress_id = sp_win.id
              FROM sequence_progress sp_lose
              JOIN sequence_progress sp_win
                ON sp_win.track_progress_id = v_dup_tp_id
               AND sp_win.sequence_id       = sp_lose.sequence_id
             WHERE qs.sequence_progress_id  = sp_lose.id
               AND sp_lose.track_progress_id = v_canon_tp_id;

            UPDATE quiz_submission
               SET sequence_progress_id = NULL
             WHERE sequence_progress_id IN (
                   SELECT id FROM sequence_progress WHERE track_progress_id = v_canon_tp_id
             );

            DELETE FROM track_progress WHERE id = v_canon_tp_id;
            -- promove o duplicado para a participation canonica
            UPDATE track_progress SET participation_id = p_canon_part_id WHERE id = v_dup_tp_id;
        ELSE
            -- canonico vence (default em empate): perdedor = duplicado
            UPDATE quiz_submission qs
               SET sequence_progress_id = sp_win.id
              FROM sequence_progress sp_lose
              JOIN sequence_progress sp_win
                ON sp_win.track_progress_id = v_canon_tp_id
               AND sp_win.sequence_id       = sp_lose.sequence_id
             WHERE qs.sequence_progress_id  = sp_lose.id
               AND sp_lose.track_progress_id = v_dup_tp_id;

            UPDATE quiz_submission
               SET sequence_progress_id = NULL
             WHERE sequence_progress_id IN (
                   SELECT id FROM sequence_progress WHERE track_progress_id = v_dup_tp_id
             );

            DELETE FROM track_progress WHERE id = v_dup_tp_id;
        END IF;
    END LOOP;

    -- track_progress sem colisao: reatribui
    UPDATE track_progress
       SET participation_id = p_canon_part_id
     WHERE participation_id = p_dup_part_id;

    -- 2) quiz_submission: reatribui tudo (sem unique constraint)
    UPDATE quiz_submission
       SET participation_id = p_canon_part_id
     WHERE participation_id = p_dup_part_id;

    -- 3) report (e via cascade FK em report.id, suas filhas
    --    report_integration_event/message/syndrome_score seguem junto):
    UPDATE report
       SET participation_id = p_canon_part_id
     WHERE participation_id = p_dup_part_id;

    -- 4) participation_profile_extra: descarta duplicados em colisao,
    --    reatribui o resto.
    DELETE FROM participation_profile_extra
     WHERE participation_id = p_dup_part_id
       AND form_id IN (
            SELECT form_id FROM participation_profile_extra
             WHERE participation_id = p_canon_part_id
       );
    UPDATE participation_profile_extra
       SET participation_id = p_canon_part_id
     WHERE participation_id = p_dup_part_id;

    -- 5) participation_report_day: idem
    DELETE FROM participation_report_day
     WHERE participation_id = p_dup_part_id
       AND report_date IN (
            SELECT report_date FROM participation_report_day
             WHERE participation_id = p_canon_part_id
       );
    UPDATE participation_report_day
       SET participation_id = p_canon_part_id
     WHERE participation_id = p_dup_part_id;

    -- 6) participation_report_streak: 1:1, canonico sempre vence
    DELETE FROM participation_report_streak WHERE participation_id = p_dup_part_id;

    -- 7) participation_role: une papeis sem duplicar PK
    INSERT INTO participation_role (participation_id, role_id)
         SELECT p_canon_part_id, role_id
           FROM participation_role
          WHERE participation_id = p_dup_part_id
    ON CONFLICT (participation_id, role_id) DO NOTHING;
    DELETE FROM participation_role WHERE participation_id = p_dup_part_id;
END;
$function$;
