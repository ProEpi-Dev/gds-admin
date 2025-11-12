-- Criar tipos ENUM
DO $$ BEGIN
    CREATE TYPE context_access_type AS ENUM ('PUBLIC', 'PRIVATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_type_enum AS ENUM ('POSITIVE', 'NEGATIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE form_type_enum AS ENUM ('signal', 'quiz');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE form_version_access_type AS ENUM ('PUBLIC', 'PRIVATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela USER
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true
);

-- Tabela LOCATION
CREATE TABLE IF NOT EXISTS location (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES location(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    polygons JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true
);

-- Tabela CONTEXT
CREATE TABLE IF NOT EXISTS context (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES location(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(255),
    access_type context_access_type NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true
);

-- Tabela PARTICIPATION
CREATE TABLE IF NOT EXISTS participation (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    context_id INTEGER NOT NULL REFERENCES context(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela CONTEXT_MANAGER
CREATE TABLE IF NOT EXISTS context_manager (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    context_id INTEGER NOT NULL REFERENCES context(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(user_id, context_id)
);

-- Tabela FORM
CREATE TABLE IF NOT EXISTS form (
    id SERIAL PRIMARY KEY,
    context_id INTEGER REFERENCES context(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    reference VARCHAR(255),
    description TEXT,
    type form_type_enum NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true
);

-- Tabela FORM_VERSION
CREATE TABLE IF NOT EXISTS form_version (
    id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL REFERENCES form(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    definition JSONB NOT NULL,
    access_type form_version_access_type NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(form_id, version_number)
);

-- Tabela REPORT
CREATE TABLE IF NOT EXISTS report (
    id SERIAL PRIMARY KEY,
    participation_id INTEGER NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
    report_type report_type_enum NOT NULL,
    occurrence_location JSONB,
    form_version_id INTEGER NOT NULL REFERENCES form_version(id) ON DELETE RESTRICT,
    form_response JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_location_parent_id ON location(parent_id);
CREATE INDEX IF NOT EXISTS idx_context_location_id ON context(location_id);
CREATE INDEX IF NOT EXISTS idx_participation_user_id ON participation(user_id);
CREATE INDEX IF NOT EXISTS idx_participation_context_id ON participation(context_id);
CREATE INDEX IF NOT EXISTS idx_context_manager_user_id ON context_manager(user_id);
CREATE INDEX IF NOT EXISTS idx_context_manager_context_id ON context_manager(context_id);
CREATE INDEX IF NOT EXISTS idx_form_context_id ON form(context_id);
CREATE INDEX IF NOT EXISTS idx_form_version_form_id ON form_version(form_id);
CREATE INDEX IF NOT EXISTS idx_report_participation_id ON report(participation_id);
CREATE INDEX IF NOT EXISTS idx_report_form_version_id ON report(form_version_id);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_user_updated_at ON "user";
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_location_updated_at ON location;
CREATE TRIGGER update_location_updated_at BEFORE UPDATE ON location
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_context_updated_at ON context;
CREATE TRIGGER update_context_updated_at BEFORE UPDATE ON context
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_participation_updated_at ON participation;
CREATE TRIGGER update_participation_updated_at BEFORE UPDATE ON participation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_context_manager_updated_at ON context_manager;
CREATE TRIGGER update_context_manager_updated_at BEFORE UPDATE ON context_manager
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_form_updated_at ON form;
CREATE TRIGGER update_form_updated_at BEFORE UPDATE ON form
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_form_version_updated_at ON form_version;
CREATE TRIGGER update_form_version_updated_at BEFORE UPDATE ON form_version
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_updated_at ON report;
CREATE TRIGGER update_report_updated_at BEFORE UPDATE ON report
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

