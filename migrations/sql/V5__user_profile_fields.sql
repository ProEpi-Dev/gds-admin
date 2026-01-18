-- V5: User Profile Fields, Legal Documents System and Gender
-- Adiciona sistema de documentos legais com versionamento, controle de aceite,
-- campos de perfil do usuário (gênero, localização, identificador externo)

-- ============================================================================
-- PARTE 1: Sistema de Documentos Legais
-- ============================================================================

-- Tabela de tipos de documentos legais
CREATE TABLE legal_document_type (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT true
);

-- Índices para legal_document_type
CREATE INDEX idx_legal_document_type_code ON legal_document_type(code);
CREATE INDEX idx_legal_document_type_active ON legal_document_type(active);

-- Inserir tipos iniciais de documentos legais
INSERT INTO legal_document_type (code, name, description, is_required) VALUES
  ('TERMS_OF_USE', 'Termos de Uso', 'Termos e condições de uso da plataforma', true),
  ('PRIVACY_POLICY', 'Política de Privacidade', 'Política de privacidade e proteção de dados', true),
  ('COOKIE_POLICY', 'Política de Cookies', 'Política de uso de cookies', false),
  ('COMMUNITY_GUIDELINES', 'Diretrizes da Comunidade', 'Regras de convivência e conduta', false),
  ('DATA_PROCESSING', 'Processamento de Dados', 'Acordo de processamento de dados pessoais', false);

-- Tabela de documentos legais
CREATE TABLE legal_document (
  id SERIAL PRIMARY KEY,
  type_id INT NOT NULL REFERENCES legal_document_type(id) ON DELETE RESTRICT,
  version VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT true,
  UNIQUE(type_id, version)
);

-- Índices para legal_document
CREATE INDEX idx_legal_document_type_id ON legal_document(type_id);
CREATE INDEX idx_legal_document_active ON legal_document(active);
CREATE INDEX idx_legal_document_effective_date ON legal_document(effective_date);

-- Inserir documentos legais iniciais
INSERT INTO legal_document (type_id, version, title, content, effective_date) VALUES
  (1, '1.0', 'Termos de Uso', 'Este documento estabelece os termos e condições gerais de uso da plataforma. Ao utilizar nossos serviços, você concorda em cumprir estes termos.', CURRENT_DATE),
  (2, '1.0', 'Política de Privacidade', 'Esta política descreve como coletamos, usamos e protegemos seus dados pessoais de acordo com a LGPD e outras regulamentações aplicáveis.', CURRENT_DATE);

-- Tabela de aceites de documentos legais pelos usuários
CREATE TABLE user_legal_acceptance (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  legal_document_id INT NOT NULL REFERENCES legal_document(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  UNIQUE(user_id, legal_document_id)
);

-- Índices para user_legal_acceptance
CREATE INDEX idx_user_legal_acceptance_user_id ON user_legal_acceptance(user_id);
CREATE INDEX idx_user_legal_acceptance_document_id ON user_legal_acceptance(legal_document_id);
CREATE INDEX idx_user_legal_acceptance_accepted_at ON user_legal_acceptance(accepted_at);

-- ============================================================================
-- PARTE 2: Sistema de Gênero
-- ============================================================================

-- Tabela de gêneros
CREATE TABLE gender (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT true
);

-- Inserir dados iniciais de gêneros
INSERT INTO gender (name) VALUES 
  ('Masculino'),
  ('Feminino'),
  ('Outro'),
  ('Prefiro não informar');

-- ============================================================================
-- PARTE 3: Campos Adicionais do Perfil do Usuário
-- ============================================================================

-- Adicionar campos de perfil à tabela user
ALTER TABLE "user" 
  ADD COLUMN gender_id INT REFERENCES gender(id),
  ADD COLUMN location_id INT REFERENCES location(id),
  ADD COLUMN external_identifier VARCHAR(100);

-- Índices para os novos campos de user
CREATE INDEX idx_user_gender_id ON "user"(gender_id);
CREATE INDEX idx_user_location_id ON "user"(location_id);
CREATE INDEX idx_user_external_identifier ON "user"(external_identifier);

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

-- Esta migration adiciona:
-- 1. Sistema completo de documentos legais com versionamento
-- 2. Controle de aceite de termos com auditoria (IP, User-Agent)
-- 3. Tabela de gêneros
-- 4. Campos adicionais no perfil do usuário (gênero, localização, identificador externo)
