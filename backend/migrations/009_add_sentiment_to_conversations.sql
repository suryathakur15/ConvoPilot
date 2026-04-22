-- Adds live sentiment tracking columns to conversations.
-- sentiment:       frustrated | neutral | happy | unknown
-- sentiment_score: 0 (most frustrated) → 100 (most happy)
-- sentiment_coaching: last AI-generated coaching tip for agents

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS sentiment         VARCHAR(20)  NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS sentiment_score   SMALLINT     NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS sentiment_coaching TEXT         NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sentiment_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversations_sentiment ON conversations (sentiment);
