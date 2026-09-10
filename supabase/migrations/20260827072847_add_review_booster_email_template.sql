/*
# Add review booster email template storage

## Summary
Adds columns to the profiles table so the Review Booster can store a
customisable email subject and body, plus a `review_booster_sent` counter
and `review_booster_last_sent_at` timestamp for tracking. This lets users
edit the review request email (with AI-suggested default) before launching,
mirroring the campaigns flow.

## Changes to existing tables
- `profiles`:
  - `review_email_subject` (text) — custom subject line for review requests
  - `review_email_body` (text) — custom body text for review requests
  - `review_booster_sent` (integer, default 0) — total review emails sent
  - `review_booster_last_sent_at` (timestamptz) — last send timestamp

## Security
- No new tables. Existing profiles RLS policies already cover these columns
  (owner-scoped UPDATE for the authenticated user).
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS review_email_subject text,
  ADD COLUMN IF NOT EXISTS review_email_body text,
  ADD COLUMN IF NOT EXISTS review_booster_sent integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_booster_last_sent_at timestamptz;
