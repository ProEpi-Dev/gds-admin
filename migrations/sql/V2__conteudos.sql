-- Cria tabela content
CREATE TABLE IF NOT EXISTS content (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    reference VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT false,
    summary VARCHAR(500),
    slug VARCHAR(255) NOT NULL,
    author_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    context_id INTEGER REFERENCES context(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    CONSTRAINT uq_content_reference UNIQUE(reference),
    CONSTRAINT uq_content_slug UNIQUE(slug),
    CONSTRAINT chk_content_published_if_active CHECK ((active = false) OR (published_at IS NOT NULL))
);

-- Cria tabela tag
CREATE TABLE IF NOT EXISTS tag (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_tag_name UNIQUE(name)
);

-- Tabela de relação content_tag (N:N)
CREATE TABLE IF NOT EXISTS content_tag (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_content_tag_unique UNIQUE(content_id, tag_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_content_title ON content(title);
CREATE INDEX IF NOT EXISTS idx_content_active ON content(active);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
CREATE INDEX IF NOT EXISTS idx_content_author_id ON content(author_id);
CREATE INDEX IF NOT EXISTS idx_content_context_id ON content(context_id);
CREATE INDEX IF NOT EXISTS idx_content_reference ON content(reference);
CREATE INDEX IF NOT EXISTS idx_content_slug_idx ON content(slug);

CREATE INDEX IF NOT EXISTS idx_tag_name_idx ON tag(name);

CREATE INDEX IF NOT EXISTS idx_content_tag_content_id ON content_tag(content_id);
CREATE INDEX IF NOT EXISTS idx_content_tag_tag_id ON content_tag(tag_id);

-- Função para atualizar updated_at 
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at nas novas tabelas
DROP TRIGGER IF EXISTS update_content_updated_at ON content;
CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tag_updated_at ON tag;
CREATE TRIGGER update_tag_updated_at BEFORE UPDATE ON tag
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_tag_updated_at ON content_tag;
CREATE TRIGGER update_content_tag_updated_at BEFORE UPDATE ON content_tag
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();