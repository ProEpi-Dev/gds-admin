-- Remove a tabela context_manager (legado).
-- Os dados já foram migrados para participation + participation_role na V14.
-- Antes de aplicar esta migração, verifique que a V14 foi executada com sucesso.

DROP TABLE IF EXISTS context_manager;
