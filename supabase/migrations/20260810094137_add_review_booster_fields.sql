-- Add Google review URL to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_review_url text;

-- Add review tracking fields to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS review_requested boolean DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS review_completed boolean DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;

-- Index for review queries
CREATE INDEX IF NOT EXISTS clients_review_requested_idx ON clients (user_id, review_requested);