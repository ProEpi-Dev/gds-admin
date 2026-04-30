-- Conteúdo exclusivo para trilhas: oculto da listagem geral do app para quem só lê conteúdo (sem content:write).
ALTER TABLE content
    ADD COLUMN IF NOT EXISTS track_exclusive BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN content.track_exclusive IS 'Se true, o conteúdo não aparece na listagem geral para participantes; permanece disponível nas trilhas e no painel administrativo.';
