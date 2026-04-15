-- Obrigatoriedade de campos do cadastro/perfil por contexto (consumido em GET /users/me/profile-status).
INSERT INTO context_configuration (context_id, key, value)
SELECT c.id, 'profile_require_gender', 'true'::jsonb
FROM context c
ON CONFLICT (context_id, key) DO NOTHING;

INSERT INTO context_configuration (context_id, key, value)
SELECT c.id, 'profile_require_country', 'false'::jsonb
FROM context c
ON CONFLICT (context_id, key) DO NOTHING;

INSERT INTO context_configuration (context_id, key, value)
SELECT c.id, 'profile_require_location', 'false'::jsonb
FROM context c
ON CONFLICT (context_id, key) DO NOTHING;

INSERT INTO context_configuration (context_id, key, value)
SELECT c.id, 'profile_require_external_identifier', 'true'::jsonb
FROM context c
ON CONFLICT (context_id, key) DO NOTHING;

INSERT INTO context_configuration (context_id, key, value)
SELECT c.id, 'profile_require_phone', 'false'::jsonb
FROM context c
ON CONFLICT (context_id, key) DO NOTHING;
