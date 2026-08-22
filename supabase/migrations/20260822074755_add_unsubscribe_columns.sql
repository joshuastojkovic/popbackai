-- Add unsubscribe tracking to campaign_recipients
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS unsubscribed boolean DEFAULT false;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;
