-- Tokens de refresh opacos: apenas hash SHA-256 armazenado; rotação no endpoint /auth/refresh

CREATE TABLE user_refresh_token (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP(6) NULL,
    CONSTRAINT fk_user_refresh_token_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_user_refresh_token_hash ON user_refresh_token(token_hash);
CREATE INDEX idx_user_refresh_token_user_id ON user_refresh_token(user_id);
CREATE INDEX idx_user_refresh_token_expires_at ON user_refresh_token(expires_at);
