-- Flag de treinamento na participação (roteamento homologação vs produção).
ALTER TABLE participation ADD COLUMN integration_training_mode BOOLEAN NOT NULL DEFAULT false;

-- Status de integração de um report com sistema externo.
CREATE TYPE integration_event_status AS ENUM ('pending', 'processing', 'sent', 'failed');

CREATE TABLE report_integration_event (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES report(id) ON DELETE CASCADE,
    external_event_id VARCHAR(255),
    status integration_event_status NOT NULL DEFAULT 'pending',
    environment VARCHAR(20) NOT NULL DEFAULT 'production',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP(6),
    last_error TEXT,
    request_payload JSONB,
    response_payload JSONB,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_report_integration_event_report UNIQUE (report_id)
);

CREATE INDEX idx_rie_report_id ON report_integration_event(report_id);
CREATE INDEX idx_rie_status ON report_integration_event(status);
CREATE INDEX idx_rie_external_event_id ON report_integration_event(external_event_id);

-- Status de sincronização de mensagens.
CREATE TYPE integration_message_direction AS ENUM ('inbound', 'outbound');

CREATE TABLE report_integration_message (
    id SERIAL PRIMARY KEY,
    integration_event_id INTEGER NOT NULL REFERENCES report_integration_event(id) ON DELETE CASCADE,
    external_message_id VARCHAR(255),
    direction integration_message_direction NOT NULL,
    body TEXT NOT NULL,
    author VARCHAR(255),
    remote_created_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rim_external_message UNIQUE (integration_event_id, external_message_id)
);

CREATE INDEX idx_rim_event_id ON report_integration_message(integration_event_id);

-- Configuração versionada de mapeamento de integração por contexto.
CREATE TABLE integration_config (
    id SERIAL PRIMARY KEY,
    context_id INTEGER NOT NULL REFERENCES context(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    base_url_production VARCHAR(500),
    base_url_homologation VARCHAR(500),
    auth_config JSONB,
    payload_mapping JSONB NOT NULL DEFAULT '{}',
    timeout_ms INTEGER NOT NULL DEFAULT 30000,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_integration_config_version UNIQUE (context_id, version)
);

CREATE INDEX idx_ic_context_id ON integration_config(context_id);
CREATE INDEX idx_ic_active ON integration_config(is_active);
