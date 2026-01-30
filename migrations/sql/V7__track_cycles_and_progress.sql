-- V7: Track Cycles and Progress Tracking
-- Adiciona sistema de ciclos de trilhas e rastreamento de progresso de usuários
-- em trilhas de aprendizado com suporte a dashboard, relatórios, certificação,
-- gamificação e bloqueio sequencial.

-- ============================================================================
-- PARTE 1: Enums
-- ============================================================================

-- Enum para status de progresso (trilha e sequência)
CREATE TYPE progress_status_enum AS ENUM ('not_started', 'in_progress', 'completed');

-- Enum para status de ciclo
CREATE TYPE track_cycle_status_enum AS ENUM ('draft', 'active', 'closed', 'archived');

-- ============================================================================
-- PARTE 2: Tabela track_cycle (Instâncias de Trilhas)
-- ============================================================================

-- Tabela de ciclos de trilhas
-- Representa uma instância/oferta específica de uma trilha em um contexto e período
CREATE TABLE track_cycle (
  id SERIAL PRIMARY KEY,
  track_id INT NOT NULL REFERENCES track(id) ON DELETE RESTRICT,
  context_id INT NOT NULL REFERENCES context(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status track_cycle_status_enum NOT NULL DEFAULT 'draft',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT true,
  CONSTRAINT chk_track_cycle_dates CHECK (end_date >= start_date),
  CONSTRAINT uq_track_cycle_track_context_name UNIQUE (track_id, context_id, name)
);

-- Índices para track_cycle
CREATE INDEX idx_track_cycle_track_id ON track_cycle(track_id);
CREATE INDEX idx_track_cycle_context_id ON track_cycle(context_id);
CREATE INDEX idx_track_cycle_status ON track_cycle(status);
CREATE INDEX idx_track_cycle_dates ON track_cycle(start_date, end_date);

-- ============================================================================
-- PARTE 3: Tabela track_progress (Progresso Geral do Usuário na Trilha)
-- ============================================================================

-- Tabela de progresso da trilha
-- Rastreia o progresso geral do usuário em um ciclo específico de trilha
CREATE TABLE track_progress (
  id SERIAL PRIMARY KEY,
  participation_id INT NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
  track_cycle_id INT NOT NULL REFERENCES track_cycle(id) ON DELETE RESTRICT,
  status progress_status_enum NOT NULL DEFAULT 'in_progress',
  progress_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  last_sequence_id INT REFERENCES sequence(id) ON DELETE SET NULL,
  current_section_id INT REFERENCES section(id) ON DELETE SET NULL,
  started_at TIMESTAMP(6),
  completed_at TIMESTAMP(6),
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_track_progress_percentage CHECK (progress_percentage >= 0.00 AND progress_percentage <= 100.00),
  CONSTRAINT uq_track_progress_participation_cycle UNIQUE (participation_id, track_cycle_id)
);

-- Índices para track_progress
CREATE INDEX idx_track_progress_participation ON track_progress(participation_id);
CREATE INDEX idx_track_progress_cycle ON track_progress(track_cycle_id);
CREATE INDEX idx_track_progress_status ON track_progress(status);
CREATE INDEX idx_track_progress_completed_at ON track_progress(completed_at);

-- ============================================================================
-- PARTE 4: Tabela sequence_progress (Progresso Detalhado por Sequência)
-- ============================================================================

-- Tabela de progresso de sequência
-- Rastreia o progresso detalhado em cada sequência (conteúdo ou quiz)
CREATE TABLE sequence_progress (
  id SERIAL PRIMARY KEY,
  track_progress_id INT NOT NULL REFERENCES track_progress(id) ON DELETE CASCADE,
  sequence_id INT NOT NULL REFERENCES sequence(id) ON DELETE CASCADE,
  status progress_status_enum NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMP(6),
  completed_at TIMESTAMP(6),
  time_spent_seconds INT,
  visits_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_sequence_progress_visits CHECK (visits_count >= 0),
  CONSTRAINT uq_sequence_progress_track_sequence UNIQUE (track_progress_id, sequence_id)
);

-- Índices para sequence_progress
CREATE INDEX idx_sequence_progress_track_progress ON sequence_progress(track_progress_id);
CREATE INDEX idx_sequence_progress_sequence ON sequence_progress(sequence_id);
CREATE INDEX idx_sequence_progress_status ON sequence_progress(status);
CREATE INDEX idx_sequence_progress_completed_at ON sequence_progress(completed_at);

-- ============================================================================
-- PARTE 5: Modificação em quiz_submission
-- ============================================================================

-- Adicionar coluna para vincular quiz submission ao progresso da sequência
ALTER TABLE quiz_submission
ADD COLUMN sequence_progress_id INT REFERENCES sequence_progress(id) ON DELETE CASCADE;

-- Índice para a nova coluna
CREATE INDEX idx_quiz_submission_sequence_progress ON quiz_submission(sequence_progress_id);

-- ============================================================================
-- Comentários nas tabelas e colunas
-- ============================================================================

COMMENT ON TABLE track_cycle IS 'Instâncias/ofertas de trilhas em contextos específicos com períodos definidos';
COMMENT ON COLUMN track_cycle.name IS 'Nome/código do ciclo (ex: 2026.1, Primeiro Semestre)';
COMMENT ON COLUMN track_cycle.status IS 'Status do ciclo: draft (rascunho), active (ativo), closed (encerrado), archived (arquivado)';

COMMENT ON TABLE track_progress IS 'Progresso geral do usuário em um ciclo de trilha';
COMMENT ON COLUMN track_progress.progress_percentage IS 'Percentual de conclusão calculado: (sequências concluídas / total) * 100';
COMMENT ON COLUMN track_progress.last_sequence_id IS 'Última sequência visitada para retomar de onde parou';

COMMENT ON TABLE sequence_progress IS 'Progresso detalhado em cada sequência (conteúdo ou quiz)';
COMMENT ON COLUMN sequence_progress.visits_count IS 'Número de vezes que o usuário visitou esta sequência';
COMMENT ON COLUMN sequence_progress.time_spent_seconds IS 'Tempo total gasto na sequência em segundos';

COMMENT ON COLUMN quiz_submission.sequence_progress_id IS 'Vincula submissão ao progresso da sequência (NULL para quizzes avulsos)';
