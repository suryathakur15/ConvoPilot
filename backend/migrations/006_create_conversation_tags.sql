CREATE TABLE IF NOT EXISTS conversation_tags (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag               VARCHAR(50) NOT NULL
                      CHECK (tag IN ('billing', 'bug', 'feature', 'general', 'onboarding', 'urgent')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_tags_conversation ON conversation_tags(conversation_id);
