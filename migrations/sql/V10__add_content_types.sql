-- Create content_type table
CREATE TABLE IF NOT EXISTS content_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    color VARCHAR(7),
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- Add indexes
CREATE INDEX idx_content_type_name ON content_type(name);
CREATE INDEX idx_content_type_active ON content_type(active);

-- Add type_id column to content table
ALTER TABLE content ADD COLUMN type_id INTEGER;

-- Add foreign key constraint
ALTER TABLE content ADD CONSTRAINT fk_content_type_id 
    FOREIGN KEY (type_id) REFERENCES content_type(id) ON DELETE SET NULL;

-- Add index for type_id
CREATE INDEX idx_content_type_id ON content(type_id);

-- Commit transaction
COMMIT;
