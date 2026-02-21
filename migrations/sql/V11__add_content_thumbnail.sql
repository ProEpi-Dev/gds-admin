-- Add optional thumbnail URL to content
ALTER TABLE content
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Optional index for future filtering/search by thumbnail presence
CREATE INDEX IF NOT EXISTS idx_content_thumbnail_url ON content(thumbnail_url);
