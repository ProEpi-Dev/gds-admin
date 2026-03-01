-- Atribui o papel global 'admin' ao primeiro usuário criado (setup user)
-- caso ele ainda não tenha role_id definido.
UPDATE "user"
SET role_id = (SELECT id FROM role WHERE code = 'admin')
WHERE id = (SELECT MIN(id) FROM "user")
  AND role_id IS NULL;
