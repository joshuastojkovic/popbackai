/*
# Reload PostgREST schema cache

1. Purpose
- Force the Supabase API (PostgREST) to reload its schema cache so it recognises
  all columns on `clients` and `campaigns`, including ones added by recent migrations.
- This fixes "column not found in schema cache" errors returned to the frontend
  even though the columns exist in the database.

2. No schema changes
- No tables, columns, indexes, or policies are modified.
- Only a `NOTIFY pgrst 'reload schema'` is issued.

3. Safety
- Safe to run multiple times.
*/

NOTIFY pgrst, 'reload schema';