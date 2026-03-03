-- Migração: para cada (user_id, context_id) em context_manager, garantir participation
-- e inserir participation_role com role manager.

-- Inserir participation onde não existir (para cada context_manager ativo)
INSERT INTO participation (user_id, context_id, start_date, end_date, active, created_at, updated_at)
SELECT cm.user_id, cm.context_id, COALESCE(cm.created_at::date, CURRENT_DATE), NULL, true, COALESCE(cm.created_at, CURRENT_TIMESTAMP), COALESCE(cm.updated_at, CURRENT_TIMESTAMP)
FROM context_manager cm
WHERE cm.active = true
  AND NOT EXISTS (
    SELECT 1 FROM participation p
    WHERE p.user_id = cm.user_id AND p.context_id = cm.context_id
  );

-- Inserir participation_role (manager) para cada context_manager ativo
INSERT INTO participation_role (participation_id, role_id)
SELECT p.id, r.id
FROM context_manager cm
JOIN participation p ON p.user_id = cm.user_id AND p.context_id = cm.context_id
JOIN role r ON r.code = 'manager'
WHERE cm.active = true
ON CONFLICT (participation_id, role_id) DO NOTHING;
