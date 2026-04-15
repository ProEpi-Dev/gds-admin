ALTER TABLE "user"
  ADD COLUMN phone VARCHAR(30),
  ADD COLUMN country VARCHAR(100);

CREATE INDEX idx_user_phone ON "user"(phone);
CREATE INDEX idx_user_country ON "user"(country);
