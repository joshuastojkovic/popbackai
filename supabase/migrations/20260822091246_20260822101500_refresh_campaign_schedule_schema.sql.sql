/*
# Refresh campaign scheduling schema

1. Purpose
- Ensure the optional `campaigns.scheduled_for` column is present for scheduling.
- Trigger the Supabase API schema cache to reload the campaigns table.

2. Modified table
- `campaigns.scheduled_for` (timestamptz, nullable) stores an optional future launch time.

3. Security
- No access policies are changed. Existing owner-scoped campaign policies remain in place.

4. Important notes
- This migration is safe to run more than once.
- Existing campaign data is preserved.
*/

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

NOTIFY pgrst, 'reload schema';