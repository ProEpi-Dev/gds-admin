-- RBAC: tabelas role, permission, role_permission, participation_role e user.role_id

-- Tabela role
CREATE TABLE IF NOT EXISTS role (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    scope VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_role_code ON role(code);
CREATE INDEX IF NOT EXISTS idx_role_scope ON role(scope);

-- Tabela permission
CREATE TABLE IF NOT EXISTS permission (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_permission_code ON permission(code);

-- Tabela role_permission
CREATE TABLE IF NOT EXISTS role_permission (
    role_id INTEGER NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX IF NOT EXISTS idx_role_permission_permission_id ON role_permission(permission_id);

-- Coluna role_id em user (papel global, ex: admin)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES role(id) ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_user_role_id ON "user"(role_id);

-- Tabela participation_role
CREATE TABLE IF NOT EXISTS participation_role (
    participation_id INTEGER NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    PRIMARY KEY (participation_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_participation_role_role_id ON participation_role(role_id);

-- Seed: papéis iniciais
INSERT INTO role (code, name, description, scope) VALUES
    ('admin', 'Administrador', 'Superadmin com acesso total ao sistema', 'global'),
    ('manager', 'Gerente', 'Gerencia o contexto (managers, trilhas, participações, conteúdo)', 'context'),
    ('content_manager', 'Gerente de Conteúdo', 'Gerencia apenas conteúdo e content-types no contexto', 'context'),
    ('participant', 'Participante', 'Participante do contexto (leitura, envio de formulários)', 'context')
ON CONFLICT (code) DO NOTHING;

-- Seed: permissões iniciais
INSERT INTO permission (code, name, description) VALUES
    ('system:admin', 'Administração do sistema', 'Acesso total ao sistema'),
    ('content:read', 'Ler conteúdo', 'Visualizar conteúdo'),
    ('content:write', 'Escrever conteúdo', 'Criar e editar conteúdo'),
    ('content-type:manage', 'Gerenciar tipos de conteúdo', 'CRUD de content-types'),
    ('managers:manage', 'Gerenciar gerentes', 'Adicionar/remover managers do contexto'),
    ('participations:manage', 'Gerenciar participações', 'Gerenciar inscrições no contexto'),
    ('tracks:manage', 'Gerenciar trilhas', 'CRUD de trilhas e ciclos'),
    ('forms:manage', 'Gerenciar formulários', 'CRUD de formulários e versões')
ON CONFLICT (code) DO NOTHING;

-- role_permission: admin tem system:admin (e bypass implícito no código)
-- manager tem todas as permissões de contexto
-- content_manager tem content + content-type
-- participant tem content:read e forms:submit (forms:submit pode ser implícito)

-- Admin: system:admin
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'admin' AND p.code = 'system:admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: todas as permissões exceto system:admin
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'manager' AND p.code IN ('content:read', 'content:write', 'content-type:manage', 'managers:manage', 'participations:manage', 'tracks:manage', 'forms:manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Content manager: conteúdo e content-type
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'content_manager' AND p.code IN ('content:read', 'content:write', 'content-type:manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Participant: apenas leitura de conteúdo (forms:submit é implícito por ter participação ativa)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'participant' AND p.code = 'content:read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
