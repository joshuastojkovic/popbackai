-- Add soft-delete support to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS campaigns_deleted_at_idx ON campaigns (user_id, deleted_at);
