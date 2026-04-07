-- Índices para relatórios / mapa de pontos (findPoints e variações).
-- Sem CONCURRENTLY: Flyway corre em transação; em DB já criado à mão com CONCURRENTLY, IF NOT EXISTS ignora.
-- Se V20 já tiver sido aplicada noutro ambiente, não edites este ficheiro — crie V21 em vez disso.

-- Ordem (participation_id, active, created_at): útil para janelas temporais por participação com active
CREATE INDEX IF NOT EXISTS idx_report_participation_active_created_at
  ON report (participation_id, active, created_at);

-- Ordem (active, created_at, participation_id): útil se o plano filtrar primeiro por active + janela temporal
CREATE INDEX IF NOT EXISTS idx_report_active_created_at_participation
  ON report (active, created_at, participation_id);

-- Parcial: só reports ativos com localização (mapa)
CREATE INDEX IF NOT EXISTS idx_report_points_map
  ON report (participation_id, created_at)
  WHERE active = true AND occurrence_location IS NOT NULL;

-- Participações ativas por contexto (complementa idx_participation_context_id quando há muitas inativas)
CREATE INDEX IF NOT EXISTS idx_participation_context_active
  ON participation (context_id)
  WHERE active = true;
