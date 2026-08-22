-- Add scheduling and cancelled status to campaigns
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled'));

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

-- Add notification preferences to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS campaign_notifications boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_notifications boolean DEFAULT true;

-- Add unique constraint on clients (user_id + email) to prevent duplicates
-- Only applies when email is not null
CREATE UNIQUE INDEX IF NOT EXISTS clients_user_email_unique_idx
  ON clients (user_id, lower(email))
  WHERE email IS NOT NULL;

-- Add unique constraint on clients (user_id + lower(name)) for clients without email
CREATE UNIQUE INDEX IF NOT EXISTS clients_user_name_unique_idx
  ON clients (user_id, lower(name))
  WHERE email IS NULL;
