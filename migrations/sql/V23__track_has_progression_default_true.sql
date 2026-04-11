-- Alinha trilhas existentes ao comportamento histórico (progressão sequencial sempre aplicada pelo backend).
UPDATE track SET has_progression = true;

-- Novas trilhas passam a assumir progressão sequencial por padrão.
ALTER TABLE track ALTER COLUMN has_progression SET DEFAULT true;
