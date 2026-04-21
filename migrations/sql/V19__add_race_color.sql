-- V19: Add race color catalog and user profile reference

-- Tabela de raça/cor
CREATE TABLE IF NOT EXISTS race_color (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT true
);

-- Dados iniciais padrão (IBGE)
INSERT INTO race_color (name) VALUES
  ('Branca'),
  ('Preta'),
  ('Parda'),
  ('Amarela'),
  ('Indígena'),
  ('Prefiro não informar')
ON CONFLICT DO NOTHING;

-- Adiciona coluna race_color_id na tabela user se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user' AND column_name = 'race_color_id'
  ) THEN
    ALTER TABLE "user"
      ADD COLUMN race_color_id INT REFERENCES race_color(id) ON UPDATE NO ACTION;
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_race_color_name ON race_color(name);
CREATE INDEX IF NOT EXISTS idx_user_race_color_id ON "user"(race_color_id);
