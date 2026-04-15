-- Índice composto para consultas de idempotência temporal em reports NEGATIVE/POSITIVE.
-- Suporta filtros por participação/tipo/ativo e ordenação por created_at DESC.
CREATE INDEX idx_report_participation_type_active_created_desc
    ON report(participation_id, report_type, active, created_at DESC);
