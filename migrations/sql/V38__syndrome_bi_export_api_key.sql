-- Chaves de API para export de scores sindrômicos (JSON para ferramentas de BI;
-- GET /v1/syndromic-classification/reports/bi-export-scores, header x-api-key).
-- Formato do valor do header: public_id (UUID) + '.' + segredo em texto; só o hash do segredo fica no banco.
CREATE TABLE syndrome_bi_export_api_key (
    id SERIAL PRIMARY KEY,
    public_id VARCHAR(36) NOT NULL,
    context_id INTEGER NOT NULL REFERENCES context(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    secret_hash VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    revoked_at TIMESTAMP(6),
    last_used_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_sbeak_public_id ON syndrome_bi_export_api_key(public_id);
CREATE INDEX idx_sbeak_context_id ON syndrome_bi_export_api_key(context_id);
