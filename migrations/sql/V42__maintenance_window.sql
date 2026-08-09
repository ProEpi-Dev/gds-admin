-- Janelas de indisponibilidade (programada ou não programada).
-- Consumida pelo MaintenanceGuard: enquanto houver janela ativa vigente,
-- os endpoints respondem 503 com o payload de manutenção.
--
-- starts_at/ends_at usam TIMESTAMPTZ (e não TIMESTAMP como o restante do schema)
-- de propósito: esta tabela é comparada contra now() para decidir se a API
-- inteira fica indisponível, e um erro de fuso aqui ou derruba o app fora da
-- janela ou deixa de bloquear dentro dela.
DO $$ BEGIN
    CREATE TYPE maintenance_mode_enum AS ENUM ('banner', 'read_only', 'full');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS maintenance_window (
    id SERIAL PRIMARY KEY,
    mode maintenance_mode_enum NOT NULL,
    starts_at TIMESTAMPTZ(6) NOT NULL,
    ends_at TIMESTAMPTZ(6) NULL,
    title JSONB NOT NULL,
    message JSONB NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- ends_at nulo = indisponibilidade sem fim previsto (não programada).
    CONSTRAINT ck_maintenance_window_period
        CHECK (ends_at IS NULL OR ends_at > starts_at),
    -- pt é o locale de fallback na resolução de Accept-Language; sem ele a tela
    -- de manutenção ficaria sem texto justamente quando nada mais funciona.
    -- jsonb_exists() em vez do operador ? para não colidir com bind parameter JDBC.
    CONSTRAINT ck_maintenance_window_title_pt CHECK (jsonb_exists(title, 'pt')),
    CONSTRAINT ck_maintenance_window_message_pt CHECK (jsonb_exists(message, 'pt'))
);

CREATE INDEX IF NOT EXISTS idx_maintenance_window_lookup
    ON maintenance_window (active, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_maintenance_window_active
    ON maintenance_window (active);

DROP TRIGGER IF EXISTS update_maintenance_window_updated_at ON maintenance_window;
CREATE TRIGGER update_maintenance_window_updated_at
    BEFORE UPDATE ON maintenance_window
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
