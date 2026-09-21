/*
# Add AI Retention Analytics columns to clients table

## Summary
Adds columns to the `clients` table to support the AI Win-Back Consultant:
lifetime spend, preferred service, preferred staff, and churn tier.
Also adds a `pos_source` column to profiles to track which POS system
(Booksy, Mindbody, Phorest, Fresha) the business uses.

## Changes to existing tables

### `clients`
- `lifetime_spend` (numeric, default 0) — total revenue from this client
- `preferred_service` (text) — most-used service (e.g. "Beard Trim")
- `preferred_staff` (text) — preferred staff member name
- `churn_tier` (text) — computed churn segment: 'active', 'slipping_away', 'high_value_at_risk', 'lapsed', 'lost'

### `profiles`
- `pos_source` (text) — which POS system the business exports from (Booksy, Mindbody, Phorest, Fresha, Other)

## Security
- No new tables. Existing RLS policies already cover these columns.
- No policy changes needed.
*/

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS lifetime_spend numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_service text,
  ADD COLUMN IF NOT EXISTS preferred_staff text,
  ADD COLUMN IF NOT EXISTS churn_tier text DEFAULT 'active';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pos_source text;

-- Index for spend-based queries (top spenders, recoverable revenue)
CREATE INDEX IF NOT EXISTS clients_lifetime_spend_idx ON clients (user_id, lifetime_spend DESC);

-- Index for churn tier filtering
CREATE INDEX IF NOT EXISTS clients_churn_tier_idx ON clients (user_id, churn_tier);
