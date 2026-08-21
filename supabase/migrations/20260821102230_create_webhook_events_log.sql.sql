/*
# Create webhook events log table

## Summary
Creates a `webhook_events` table to log raw Resend webhook payloads for
debugging. This lets us see exactly what Resend sends and why the open
tracking match is failing.

## New Tables
### `webhook_events`
- `id` (uuid, primary key)
- `event_type` (text) — the Resend event type (e.g. "email.opened")
- `email_id` (text) — the email ID extracted from the payload
- `raw_payload` (jsonb) — the complete raw webhook payload
- `matched` (boolean) — whether a matching campaign_recipient was found
- `created_at` (timestamptz) — when the webhook was received

## Security
- RLS enabled. Only authenticated users can read their own events.
- No anon access — this is internal diagnostic data.
*/

CREATE TABLE IF NOT EXISTS webhook_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text,
  email_id    text,
  raw_payload jsonb,
  matched     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_webhook_events" ON webhook_events;
CREATE POLICY "select_own_webhook_events" ON webhook_events FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_webhook_events" ON webhook_events;
CREATE POLICY "insert_webhook_events" ON webhook_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);
