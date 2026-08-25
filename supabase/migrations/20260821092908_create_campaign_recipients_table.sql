/*
# Create campaign_recipients table for open & conversion tracking

## Summary
Creates a `campaign_recipients` table that records every client who received
a campaign email. This enables two features:
1. Email open tracking — Resend webhooks match the resend email ID and
   increment the campaign's `opened` counter.
2. Conversion tracking — when a client's `last_visit_date` is updated to a
   recent date after receiving a campaign email, they count as "re-engaged".

## New Tables

### `campaign_recipients`
One row per client per campaign email sent.

| Column          | Type        | Description                                          |
|-----------------|-------------|------------------------------------------------------|
| id              | uuid        | Primary key                                          |
| campaign_id     | uuid        | References campaigns(id), cascade on delete          |
| client_id       | uuid        | References clients(id), cascade on delete            |
| user_id         | uuid        | Owner — references auth.users, defaults to caller    |
| resend_email_id | text        | ID returned by Resend API for webhook matching       |
| opened          | boolean     | Whether the email was opened (set by webhook)        |
| opened_at       | timestamptz| When the open event was received                    |
| converted       | boolean     | Whether the client re-engaged after receiving email  |
| converted_at    | timestamptz| When the conversion was detected                    |
| sent_at         | timestamptz| When the email was sent                              |

## Security
- RLS enabled. Four separate policies (SELECT / INSERT / UPDATE / DELETE).
- All scoped to `authenticated` matching on `auth.uid() = user_id`.
- `user_id` defaults to `auth.uid()`.

## Indexes
- `campaign_recipients_campaign_idx` on `campaign_id`
- `campaign_recipients_client_idx` on `client_id`
- `campaign_recipients_resend_idx` on `resend_email_id` for webhook lookups
*/

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id       uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  resend_email_id text,
  opened          boolean     NOT NULL DEFAULT false,
  opened_at       timestamptz,
  converted       boolean     NOT NULL DEFAULT false,
  converted_at    timestamptz,
  sent_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_recipients_campaign_idx ON campaign_recipients (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_recipients_client_idx   ON campaign_recipients (client_id);
CREATE INDEX IF NOT EXISTS campaign_recipients_resend_idx   ON campaign_recipients (resend_email_id);

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_recipients" ON campaign_recipients;
CREATE POLICY "select_own_recipients" ON campaign_recipients FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_recipients" ON campaign_recipients;
CREATE POLICY "insert_own_recipients" ON campaign_recipients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_recipients" ON campaign_recipients;
CREATE POLICY "update_own_recipients" ON campaign_recipients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_recipients" ON campaign_recipients;
CREATE POLICY "delete_own_recipients" ON campaign_recipients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);