-- Drop index on thumbnail_url because base64 payloads can exceed btree index row size
DROP INDEX IF EXISTS idx_content_thumbnail_url;
