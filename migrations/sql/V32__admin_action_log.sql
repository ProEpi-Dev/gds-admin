-- Auditoria global de ações administrativas (imutável)
CREATE TABLE IF NOT EXISTS admin_action_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(80) NOT NULL,
  target_entity_type VARCHAR(40) NOT NULL,
  target_entity_id VARCHAR(64) NOT NULL,
  actor_user_id INTEGER NULL,
  context_id INTEGER NULL,
  target_user_id INTEGER NULL,
  request_id VARCHAR(100) NULL,
  channel VARCHAR(20) NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  metadata JSONB NULL,
  occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_action_log_actor_user
    FOREIGN KEY (actor_user_id) REFERENCES "user"(id)
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT fk_admin_action_log_context
    FOREIGN KEY (context_id) REFERENCES context(id)
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT fk_admin_action_log_target_user
    FOREIGN KEY (target_user_id) REFERENCES "user"(id)
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_admin_action_log_occurred_at
  ON admin_action_log (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_action_log_target
  ON admin_action_log (target_entity_type, target_entity_id);

CREATE INDEX IF NOT EXISTS idx_admin_action_log_actor_user
  ON admin_action_log (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_action_log_context
  ON admin_action_log (context_id);

CREATE INDEX IF NOT EXISTS idx_admin_action_log_action
  ON admin_action_log (action);
