-- Configurações flexíveis por contexto para regras de negócio e autenticação.
CREATE TABLE context_configuration (
    id SERIAL PRIMARY KEY,
    context_id INTEGER NOT NULL REFERENCES context(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_context_configuration_context_key UNIQUE (context_id, key)
);

CREATE INDEX idx_context_configuration_context_id ON context_configuration(context_id);
CREATE INDEX idx_context_configuration_key ON context_configuration(key);

-- Defaults para contextos já existentes:
-- - Janela anti-cliques sequenciais para "nada ocorreu" (em minutos)
-- - Bloqueio por evento positivo recente (em minutos)
-- - Domínios de e-mail permitidos (vazio = sem restrição)
-- - Habilitação de SSO social
INSERT INTO context_configuration (context_id, key, value)
SELECT c.id, 'negative_report_dedup_window_min', '60'::jsonb
FROM context c
ON CONFLICT (context_id, key) DO NOTHING;

INSERT INTO context_configuration (context_id, key, value)
SELECT c.id, 'negative_block_if_positive_within_min', '60'::jsonb
FROM context c
ON CONFLICT (context_id, key) DO NOTHING;

INSERT INTO context_configuration (context_id, key, value)
SELECT c.id, 'allowed_email_domains', '[]'::jsonb
FROM context c
ON CONFLICT (context_id, key) DO NOTHING;

INSERT INTO context_configuration (context_id, key, value)
SELECT c.id, 'social_sso_enabled', 'false'::jsonb
FROM context c
ON CONFLICT (context_id, key) DO NOTHING;
