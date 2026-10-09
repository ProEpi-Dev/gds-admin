-- report.report_date: momento em que o participante fez o reporte no aparelho.
-- Com o reporte offline ele pode chegar ao backend horas ou dias depois;
-- created_at continua sendo o momento da gravacao no backend.
--
-- Reportes existentes foram enviados online, entao report_date = created_at.
-- Default CURRENT_TIMESTAMP (banco em UTC, igual ao created_at): versoes do app
-- que nao mandam o campo continuam funcionando e ficam com report_date = created_at.

ALTER TABLE report ADD COLUMN report_date TIMESTAMP(6);

UPDATE report SET report_date = created_at WHERE report_date IS NULL;

ALTER TABLE report ALTER COLUMN report_date SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE report ALTER COLUMN report_date SET NOT NULL;

COMMENT ON COLUMN report.report_date IS
    'Momento em que o participante fez o reporte no aparelho (pode ser offline). created_at e a gravacao no backend.';

-- A idempotencia de POSITIVE/NEGATIVE passa a comparar report_date. O V29 fazia o
-- mesmo por created_at; aquele indice fica ate listagem e mapa migrarem tambem.
CREATE INDEX idx_report_participation_type_active_report_date_desc
    ON report(participation_id, report_type, active, report_date DESC);
