-- Allow any custom tag value (agents can add free-form tags now)
ALTER TABLE conversation_tags
  DROP CONSTRAINT IF EXISTS conversation_tags_tag_check;
