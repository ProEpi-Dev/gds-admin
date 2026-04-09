-- Novo tipo de formulário: dados adicionais de perfil (campos configuráveis por contexto)
ALTER TYPE form_type_enum ADD VALUE 'profile_extra';

CREATE TABLE participation_profile_extra (
    id SERIAL PRIMARY KEY,
    participation_id INT NOT NULL,
    form_id INT NOT NULL,
    form_version_id INT NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT fk_participation_profile_extra_participation
        FOREIGN KEY (participation_id) REFERENCES participation(id) ON DELETE CASCADE,
    CONSTRAINT fk_participation_profile_extra_form
        FOREIGN KEY (form_id) REFERENCES form(id) ON DELETE CASCADE,
    CONSTRAINT fk_participation_profile_extra_form_version
        FOREIGN KEY (form_version_id) REFERENCES form_version(id) ON DELETE RESTRICT,
    CONSTRAINT uq_participation_profile_extra_form UNIQUE (participation_id, form_id)
);

CREATE INDEX idx_participation_profile_extra_participation_id
    ON participation_profile_extra(participation_id);
