/*
# Create campaigns table

1. New Tables
  - `campaigns`
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users, owner-scoped)
    - `name` (text) — campaign display name
    - `status` (text) — draft | active | paused | completed
    - `channel` (text) — email | sms
    - `target_segment` (text) — lapsed_90 | lapsed_180 | lapsed_365 | all_lapsed
    - `target_description` (text) — human-readable description
    - `message_subject` (text) — email subject line
    - `message_body` (text) — message content
    - `recipient_count` (int) — number of clients targeted at launch
    - `sent` (int) — total messages sent
    - `opened` (int) — total opens tracked
    - `converted` (int) — total conversions
    - `created_at` (timestamp)
    - `launched_at` (timestamp, nullable)

2. Security
  - Enable RLS on `campaigns`
  - Owner-scoped CRUD: each authenticated user accesses only their own campaigns
  - `user_id` defaults to `auth.uid()` so inserts without it still satisfy the policy
*/

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  target_segment text NOT NULL DEFAULT 'lapsed_90',
  target_description text,
  message_subject text,
  message_body text,
  recipient_count int NOT NULL DEFAULT 0,
  sent int NOT NULL DEFAULT 0,
  opened int NOT NULL DEFAULT 0,
  converted int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  launched_at timestamptz
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_campaigns" ON campaigns;
CREATE POLICY "select_own_campaigns" ON campaigns FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_campaigns" ON campaigns;
CREATE POLICY "insert_own_campaigns" ON campaigns FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_campaigns" ON campaigns;
CREATE POLICY "update_own_campaigns" ON campaigns FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_campaigns" ON campaigns;
CREATE POLICY "delete_own_campaigns" ON campaigns FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
