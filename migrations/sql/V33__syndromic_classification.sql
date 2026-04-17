-- Catálogo canônico de sintomas para classificação sindrômica.
CREATE TABLE symptom (
    id SERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_symptom_code UNIQUE (code)
);

CREATE INDEX idx_symptom_active ON symptom(active);

-- Catálogo de síndromes com limiar mínimo de aceitação.
CREATE TABLE syndrome (
    id SERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(255),
    threshold_score NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_syndrome_code UNIQUE (code)
);

CREATE INDEX idx_syndrome_active ON syndrome(active);

-- Relação N:N entre síndrome e sintoma com peso para score normalizado.
CREATE TABLE syndrome_symptom_weight (
    id SERIAL PRIMARY KEY,
    syndrome_id INTEGER NOT NULL REFERENCES syndrome(id) ON DELETE CASCADE,
    symptom_id INTEGER NOT NULL REFERENCES symptom(id) ON DELETE CASCADE,
    weight NUMERIC(8,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_syndrome_symptom_weight UNIQUE (syndrome_id, symptom_id)
);

CREATE INDEX idx_ssw_syndrome_id ON syndrome_symptom_weight(syndrome_id);
CREATE INDEX idx_ssw_symptom_id ON syndrome_symptom_weight(symptom_id);
CREATE INDEX idx_ssw_active ON syndrome_symptom_weight(active);

-- Configuração de extração de sintomas por form_version.
CREATE TABLE syndrome_form_config (
    id SERIAL PRIMARY KEY,
    form_version_id INTEGER NOT NULL REFERENCES form_version(id) ON DELETE RESTRICT,
    symptoms_field_name VARCHAR(120),
    symptoms_field_id VARCHAR(120),
    symptom_onset_date_field_name VARCHAR(120),
    symptom_onset_date_field_id VARCHAR(120),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_syndrome_form_config_form_version UNIQUE (form_version_id),
    CONSTRAINT ck_sfc_symptoms_selector
      CHECK (
        symptoms_field_name IS NOT NULL
        OR symptoms_field_id IS NOT NULL
      )
);

CREATE INDEX idx_sfc_active ON syndrome_form_config(active);

-- Mapeamento de opções de formulário para sintomas canônicos.
CREATE TABLE form_symptom_mapping (
    id SERIAL PRIMARY KEY,
    syndrome_form_config_id INTEGER NOT NULL REFERENCES syndrome_form_config(id) ON DELETE CASCADE,
    form_option_value VARCHAR(160) NOT NULL,
    form_option_label VARCHAR(255),
    symptom_id INTEGER NOT NULL REFERENCES symptom(id) ON DELETE CASCADE,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_form_symptom_mapping UNIQUE (syndrome_form_config_id, form_option_value)
);

CREATE INDEX idx_fsm_config_id ON form_symptom_mapping(syndrome_form_config_id);
CREATE INDEX idx_fsm_symptom_id ON form_symptom_mapping(symptom_id);
CREATE INDEX idx_fsm_active ON form_symptom_mapping(active);

CREATE TYPE syndrome_processing_status AS ENUM ('processed', 'skipped', 'failed');

-- Snapshot de processamento de classificação por report/síndrome.
CREATE TABLE report_syndrome_score (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES report(id) ON DELETE CASCADE,
    syndrome_id INTEGER REFERENCES syndrome(id) ON DELETE SET NULL,
    score NUMERIC(8,6),
    threshold_score_snapshot NUMERIC(8,6),
    is_above_threshold BOOLEAN,
    present_weight_sum NUMERIC(10,4),
    total_weight_sum NUMERIC(10,4),
    matched_symptom_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    processing_version VARCHAR(40) NOT NULL DEFAULT 'v1-weighted',
    processing_status syndrome_processing_status NOT NULL DEFAULT 'processed',
    processing_error TEXT,
    is_latest BOOLEAN NOT NULL DEFAULT true,
    processed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rss_report_id ON report_syndrome_score(report_id);
CREATE INDEX idx_rss_report_latest ON report_syndrome_score(report_id, is_latest);
CREATE INDEX idx_rss_syndrome_latest ON report_syndrome_score(syndrome_id, is_latest);
CREATE INDEX idx_rss_processed_at ON report_syndrome_score(processed_at DESC);
CREATE INDEX idx_rss_processing_status ON report_syndrome_score(processing_status);
