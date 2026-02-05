-- V8: Campos de redefinição de senha na tabela user
-- Adiciona password_reset_token e password_reset_expires para o fluxo "Esqueci minha senha".

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'password_reset_token'
  ) THEN
    ALTER TABLE "user" ADD COLUMN password_reset_token VARCHAR(255) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'password_reset_expires'
  ) THEN
    ALTER TABLE "user" ADD COLUMN password_reset_expires TIMESTAMP(6) NULL;
  END IF;
END $$;
