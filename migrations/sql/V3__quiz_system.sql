-- Migration V3: Sistema de Quiz
-- Adiciona suporte completo para sistema de quiz com relação N:N com conteúdo,
-- pontuação avançada, controle de tentativas e tempo limite

-- 1. Criar tabela content_quiz (N:N com metadados)
CREATE TABLE IF NOT EXISTS content_quiz (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    form_id INTEGER NOT NULL REFERENCES form(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT false,
    weight DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_content_quiz_unique UNIQUE(content_id, form_id)
);

-- Constraint para garantir que apenas formulários do tipo 'quiz' sejam associados
-- Nota: PostgreSQL não suporta CHECK constraints com subqueries diretamente,
-- então vamos usar uma função trigger ou validar na aplicação
-- Por enquanto, deixamos a validação para a aplicação

-- 2. Adicionar colunas específicas de quiz em form_version
ALTER TABLE form_version ADD COLUMN IF NOT EXISTS passing_score DECIMAL(5,2);
ALTER TABLE form_version ADD COLUMN IF NOT EXISTS max_attempts INTEGER;
ALTER TABLE form_version ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;
ALTER TABLE form_version ADD COLUMN IF NOT EXISTS show_feedback BOOLEAN DEFAULT true;
ALTER TABLE form_version ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN DEFAULT false;

-- 3. Criar tabela quiz_submission (Respostas de Quiz)
CREATE TABLE IF NOT EXISTS quiz_submission (
    id SERIAL PRIMARY KEY,
    participation_id INTEGER NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
    form_version_id INTEGER NOT NULL REFERENCES form_version(id) ON DELETE RESTRICT,
    quiz_response JSONB NOT NULL,
    score DECIMAL(5,2),
    percentage DECIMAL(5,2),
    is_passed BOOLEAN,
    attempt_number INTEGER NOT NULL,
    time_spent_seconds INTEGER,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true
);

-- 4. Criar índices para content_quiz
CREATE INDEX IF NOT EXISTS idx_content_quiz_content_id ON content_quiz(content_id);
CREATE INDEX IF NOT EXISTS idx_content_quiz_form_id ON content_quiz(form_id);
CREATE INDEX IF NOT EXISTS idx_content_quiz_display_order ON content_quiz(content_id, display_order);

-- 5. Criar índices para quiz_submission
CREATE INDEX IF NOT EXISTS idx_quiz_submission_participation_id ON quiz_submission(participation_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submission_form_version_id ON quiz_submission(form_version_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submission_score ON quiz_submission(score);
CREATE INDEX IF NOT EXISTS idx_quiz_submission_is_passed ON quiz_submission(is_passed);
CREATE INDEX IF NOT EXISTS idx_quiz_submission_attempt ON quiz_submission(participation_id, form_version_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_quiz_submission_completed_at ON quiz_submission(completed_at);

-- 6. Criar triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_content_quiz_updated_at ON content_quiz;
CREATE TRIGGER update_content_quiz_updated_at BEFORE UPDATE ON content_quiz
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quiz_submission_updated_at ON quiz_submission;
CREATE TRIGGER update_quiz_submission_updated_at BEFORE UPDATE ON quiz_submission
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

