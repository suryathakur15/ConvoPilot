CREATE TABLE IF NOT EXISTS audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  action            VARCHAR(60) NOT NULL,
  actor_type        VARCHAR(10) NOT NULL CHECK (actor_type IN ('user', 'agent', 'system')),
  actor_id          UUID,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_conversation ON audit_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at   ON audit_logs(created_at DESC);
