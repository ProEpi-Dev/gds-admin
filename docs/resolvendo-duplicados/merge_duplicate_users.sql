-- Mescla usuários duplicados (cadastros legados antes da verificação de e-mail).
-- Depende de _merge_participation_activity.sql (executar aquela função primeiro).
--
-- Histórico: criada manualmente em produção. Não faz parte das migrations Flyway.
-- Referência para manutenção e eventual remoção futura.

CREATE OR REPLACE FUNCTION public.merge_duplicate_users(
  p_canonical_user_id integer,
  p_duplicate_user_ids integer[]
)
RETURNS TABLE(action text, detail text)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_dup_user_id   INT;
    v_dup_part_id   INT;
    v_canon_part_id INT;
    v_count         INT;
BEGIN
    -- Validacoes
    IF p_canonical_user_id IS NULL OR p_duplicate_user_ids IS NULL
       OR array_length(p_duplicate_user_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'canonical_user_id e duplicate_user_ids sao obrigatorios';
    END IF;

    IF p_canonical_user_id = ANY(p_duplicate_user_ids) THEN
        RAISE EXCEPTION 'canonical_user_id (%) nao pode estar em duplicate_user_ids', p_canonical_user_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "user" WHERE id = p_canonical_user_id) THEN
        RAISE EXCEPTION 'usuario canonico % nao existe', p_canonical_user_id;
    END IF;

    SELECT COUNT(*) INTO v_count
      FROM "user" WHERE id = ANY(p_duplicate_user_ids);
    IF v_count <> array_length(p_duplicate_user_ids, 1) THEN
        RAISE EXCEPTION 'um ou mais duplicate_user_ids nao existem (encontrados %, esperados %)',
            v_count, array_length(p_duplicate_user_ids, 1);
    END IF;

    RETURN QUERY SELECT 'start'::TEXT,
        format('canonical=%s duplicates=%s', p_canonical_user_id, p_duplicate_user_ids)::TEXT;

    FOREACH v_dup_user_id IN ARRAY p_duplicate_user_ids LOOP
        -- 1) Tratar cada participation do duplicado
        FOR v_dup_part_id, v_canon_part_id IN
            SELECT pd.id,
                   (SELECT pc.id FROM participation pc
                     WHERE pc.user_id = p_canonical_user_id
                       AND pc.context_id = pd.context_id
                     LIMIT 1)
              FROM participation pd
             WHERE pd.user_id = v_dup_user_id
        LOOP
            IF v_canon_part_id IS NULL THEN
                -- sem colisao: reatribui participation inteira
                UPDATE participation
                   SET user_id = p_canonical_user_id
                 WHERE id = v_dup_part_id;
                RETURN QUERY SELECT 'reassign_participation'::TEXT,
                    format('part_id=%s -> user=%s', v_dup_part_id, p_canonical_user_id)::TEXT;
            ELSE
                -- colisao: mescla atividade na canonica e deleta a duplicada
                PERFORM _merge_participation_activity(v_dup_part_id, v_canon_part_id);
                DELETE FROM participation WHERE id = v_dup_part_id;
                RETURN QUERY SELECT 'merge_participation'::TEXT,
                    format('dup=%s -> canon=%s', v_dup_part_id, v_canon_part_id)::TEXT;
            END IF;
        END LOOP;

        -- 2) FKs diretas a user
        UPDATE content
           SET author_id = p_canonical_user_id
         WHERE author_id = v_dup_user_id;

        -- user_legal_acceptance tem UNIQUE (user_id, legal_document_id):
        -- remove os do duplicado que ja existem no canonico, depois reatribui o resto.
        DELETE FROM user_legal_acceptance
         WHERE user_id = v_dup_user_id
           AND legal_document_id IN (
                SELECT legal_document_id FROM user_legal_acceptance
                 WHERE user_id = p_canonical_user_id
           );
        UPDATE user_legal_acceptance
           SET user_id = p_canonical_user_id
         WHERE user_id = v_dup_user_id;

        UPDATE user_refresh_token
           SET user_id = p_canonical_user_id
         WHERE user_id = v_dup_user_id;

        UPDATE syndrome_bi_export_api_key
           SET created_by_user_id = p_canonical_user_id
         WHERE created_by_user_id = v_dup_user_id;

        RETURN QUERY SELECT 'reassigned_user_fks'::TEXT,
            format('dup_user=%s', v_dup_user_id)::TEXT;
    END LOOP;

    -- 3) Delete final dos users duplicados
    DELETE FROM "user" WHERE id = ANY(p_duplicate_user_ids);
    RETURN QUERY SELECT 'deleted_duplicate_users'::TEXT,
        format('ids=%s', p_duplicate_user_ids)::TEXT;

    RETURN QUERY SELECT 'done'::TEXT, 'merge concluido'::TEXT;
END;
$function$;
