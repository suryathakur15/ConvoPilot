CREATE TABLE IF NOT EXISTS conversation_agents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role              VARCHAR(20) NOT NULL DEFAULT 'contributor'
                      CHECK (role IN ('primary', 'contributor')),
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_agents_conversation ON conversation_agents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_agents_agent        ON conversation_agents(agent_id);
