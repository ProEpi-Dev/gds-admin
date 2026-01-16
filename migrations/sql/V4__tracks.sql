-- V4__tracks.sql
-- Migration para o sistema de trilhas de conteúdo

-- Tabela TRACK
CREATE TABLE IF NOT EXISTS track (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    context_id INTEGER REFERENCES context(id),
    control_period BOOLEAN NOT NULL DEFAULT false,
    start_date DATE,
    end_date DATE,
    show_after_completion BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true
);

-- Índices para TRACK
CREATE INDEX IF NOT EXISTS idx_track_context_id ON track(context_id);
CREATE INDEX IF NOT EXISTS idx_track_active ON track(active);

-- Tabela SECTION
CREATE TABLE IF NOT EXISTS section (
    id SERIAL PRIMARY KEY,
    track_id INTEGER NOT NULL REFERENCES track(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true
);

-- Índices para SECTION
CREATE INDEX IF NOT EXISTS idx_section_track_id ON section(track_id);
CREATE INDEX IF NOT EXISTS idx_section_order ON section("order");

-- Tabela SEQUENCE
CREATE TABLE IF NOT EXISTS sequence (
    id SERIAL PRIMARY KEY,
    section_id INTEGER NOT NULL REFERENCES section(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES content(id),
    form_id INTEGER REFERENCES form(id),
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true
);

-- Índices para SEQUENCE
CREATE INDEX IF NOT EXISTS idx_sequence_section_id ON sequence(section_id);
CREATE INDEX IF NOT EXISTS idx_sequence_content_id ON sequence(content_id);
CREATE INDEX IF NOT EXISTS idx_sequence_form_id ON sequence(form_id);
CREATE INDEX IF NOT EXISTS idx_sequence_order ON sequence("order");