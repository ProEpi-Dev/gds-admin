DO $$
BEGIN
  CREATE TYPE location_org_level AS ENUM ('COUNTRY', 'STATE_DISTRICT', 'CITY_COUNCIL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

ALTER TABLE location
  ADD COLUMN IF NOT EXISTS org_level location_org_level NOT NULL DEFAULT 'CITY_COUNCIL';

UPDATE location
SET org_level = 'COUNTRY'
WHERE parent_id IS NULL;

UPDATE location l
SET org_level = 'STATE_DISTRICT'
WHERE l.parent_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM location p
    WHERE p.id = l.parent_id
      AND p.parent_id IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_location_org_level ON location(org_level);

ALTER TABLE location
  DROP COLUMN IF EXISTS is_country;

DROP INDEX IF EXISTS idx_user_country;

ALTER TABLE "user"
  DROP COLUMN IF EXISTS country;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS country_location_id INTEGER REFERENCES location(id) ON UPDATE NO ACTION ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_country_location_id ON "user"(country_location_id);
