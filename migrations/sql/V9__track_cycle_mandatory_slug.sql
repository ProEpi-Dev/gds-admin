-- V9: Slug obrigatório em ciclos de trilha
-- Campo opcional e único: quando preenchido, marca o ciclo como "trilha obrigatória"
-- no contexto; só pode existir um ciclo com o mesmo slug em todo o sistema.

ALTER TABLE track_cycle
  ADD COLUMN mandatory_slug VARCHAR(80) NULL;

CREATE UNIQUE INDEX idx_track_cycle_mandatory_slug ON track_cycle(mandatory_slug)
  WHERE mandatory_slug IS NOT NULL;

COMMENT ON COLUMN track_cycle.mandatory_slug IS 'Slug único que marca o ciclo como trilha obrigatória. Apenas um ciclo no sistema pode ter cada valor; NULL = ciclo não obrigatório.';
