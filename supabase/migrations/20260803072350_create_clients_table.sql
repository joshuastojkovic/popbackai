/*
# Create clients table for PopbackAI

## Summary
Creates a `clients` table to store client contact records imported from CSV
files exported by booking platforms like Fresha and Square.

## New Tables

### `clients`
Stores one row per client per user account (multi-tenant, user-scoped).

| Column         | Type        | Description                                        |
|----------------|-------------|----------------------------------------------------|
| id             | uuid        | Primary key                                        |
| user_id        | uuid        | Owner — references auth.users, defaults to caller  |
| name           | text        | Client full name (required)                        |
| email          | text        | Email address (optional)                           |
| phone          | text        | Phone number (optional)                            |
| last_visit_date| date        | Most recent visit date (optional)                  |
| source         | text        | Import source label (e.g. 'fresha', 'square', 'csv')|
| notes          | text        | Free-form notes (optional)                         |
| created_at     | timestamptz | Row creation timestamp                             |
| updated_at     | timestamptz | Last update timestamp                              |

## Security
- RLS enabled. Four separate policies (SELECT / INSERT / UPDATE / DELETE).
- All policies scope to `authenticated` and match on `auth.uid() = user_id`.
- `user_id` defaults to `auth.uid()` so the frontend can insert without passing it.

## Indexes
- `clients_user_id_idx` on `user_id` for fast per-user queries
- `clients_last_visit_idx` on `(user_id, last_visit_date)` for churn/status queries
*/

CREATE TABLE IF NOT EXISTS clients (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  email            text,
  phone            text,
  last_visit_date  date,
  source           text        DEFAULT 'csv',
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_user_id_idx      ON clients (user_id);
CREATE INDEX IF NOT EXISTS clients_last_visit_idx   ON clients (user_id, last_visit_date);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_clients" ON clients;
CREATE POLICY "select_own_clients" ON clients FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_clients" ON clients;
CREATE POLICY "insert_own_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_clients" ON clients;
CREATE POLICY "update_own_clients" ON clients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_clients" ON clients;
CREATE POLICY "delete_own_clients" ON clients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
