-- Configuração sindrômica por formulário (form), não por versão (form_version):
-- novas versões do mesmo form continuam usando a mesma configuração.

ALTER TABLE syndrome_form_config ADD COLUMN form_id INTEGER;

UPDATE syndrome_form_config sfc
SET form_id = fv.form_id
FROM form_version fv
WHERE fv.id = sfc.form_version_id;

ALTER TABLE syndrome_form_config ALTER COLUMN form_id SET NOT NULL;

ALTER TABLE syndrome_form_config DROP CONSTRAINT IF EXISTS syndrome_form_config_form_version_id_fkey;
ALTER TABLE syndrome_form_config DROP CONSTRAINT IF EXISTS uq_syndrome_form_config_form_version;

ALTER TABLE syndrome_form_config DROP COLUMN form_version_id;

ALTER TABLE syndrome_form_config
  ADD CONSTRAINT syndrome_form_config_form_id_fkey
  FOREIGN KEY (form_id) REFERENCES form (id) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE syndrome_form_config
  ADD CONSTRAINT uq_syndrome_form_config_form UNIQUE (form_id);

CREATE INDEX IF NOT EXISTS idx_sfc_form_id ON syndrome_form_config (form_id);
