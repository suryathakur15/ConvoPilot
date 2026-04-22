CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type       VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'agent', 'bot')),
  sender_id         UUID NOT NULL,
  content           TEXT NOT NULL,
  message_type      VARCHAR(10) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'note')),
  parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id       ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at      ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id       ON messages(parent_message_id)
  WHERE parent_message_id IS NOT NULL;
