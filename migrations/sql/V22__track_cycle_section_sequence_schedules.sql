-- Janelas opcionais por seção e por sequência (conteúdo/quiz) por ciclo de trilha
CREATE TABLE track_cycle_section_schedule (
    id SERIAL PRIMARY KEY,
    track_cycle_id INTEGER NOT NULL REFERENCES track_cycle(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES section(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_track_cycle_section_schedule UNIQUE (track_cycle_id, section_id)
);

CREATE INDEX idx_tc_section_sched_cycle ON track_cycle_section_schedule(track_cycle_id);

CREATE TABLE track_cycle_sequence_schedule (
    id SERIAL PRIMARY KEY,
    track_cycle_id INTEGER NOT NULL REFERENCES track_cycle(id) ON DELETE CASCADE,
    sequence_id INTEGER NOT NULL REFERENCES sequence(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_track_cycle_sequence_schedule UNIQUE (track_cycle_id, sequence_id)
);

CREATE INDEX idx_tc_sequence_sched_cycle ON track_cycle_sequence_schedule(track_cycle_id);
