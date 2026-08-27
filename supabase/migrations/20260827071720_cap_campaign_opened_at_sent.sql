/*
# Cap campaign opened counter at sent count

## Summary
Fixes the open-rate tracker so it can never exceed 100%:
1. Replaces `increment_campaign_opened` so it only increments when
   `opened < sent` — duplicate webhook events and fallback matching
   strategies can no longer push the counter above the number sent.
2. Clamps any existing rows where `opened > sent` back down to `sent`
   so current analytics display correctly immediately.

## Security
- `increment_campaign_opened` stays SECURITY DEFINER (called by the
  service-role edge function). The new guard is a pure integer check.
- No RLS or policy changes.
*/

-- Only increment if we haven't already counted every sent email
CREATE OR REPLACE FUNCTION increment_campaign_opened(campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE campaigns
  SET opened = opened + 1
  WHERE id = campaign_id
    AND opened < sent;
END;
$$;

-- Clamp any existing over-counted campaigns back to sent
UPDATE campaigns
SET opened = sent
WHERE opened > sent;
