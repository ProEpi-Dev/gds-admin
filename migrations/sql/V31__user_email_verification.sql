-- Confirmação de email (opcional por contexto via require_email_verification).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP(6);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP(6);

-- Contas existentes: consideradas já verificadas (comportamento atual).
UPDATE "user" SET email_verified_at = CURRENT_TIMESTAMP WHERE email_verified_at IS NULL;

INSERT INTO context_configuration (context_id, key, value)
SELECT c.id, 'require_email_verification', 'false'::jsonb
FROM context c
ON CONFLICT (context_id, key) DO NOTHING;
