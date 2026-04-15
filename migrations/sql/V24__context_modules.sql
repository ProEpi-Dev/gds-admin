-- Módulos habilitados por contexto para composição de experiências no app.
CREATE TYPE context_module_code AS ENUM ('self_health', 'community_signal');

CREATE TABLE context_module (
    id SERIAL PRIMARY KEY,
    context_id INTEGER NOT NULL REFERENCES context(id) ON DELETE CASCADE,
    module_code context_module_code NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_context_module_unique UNIQUE (context_id, module_code)
);

CREATE INDEX idx_context_module_context_id ON context_module(context_id);
