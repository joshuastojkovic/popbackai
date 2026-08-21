/*
# Add campaign open & conversion tracking functions

## Summary
Creates two SECURITY DEFINER functions:
1. `increment_campaign_opened` — atomically increments the `opened` counter
   on a campaign when a webhook reports an email open. Called by the
   resend-webhook edge function (which uses the service role key, bypassing RLS).
2. `recompute_campaign_conversions` — checks all campaign_recipients for a
   given campaign and marks clients as "converted" if their `last_visit_date`
   has been updated to a date AFTER the email was sent (meaning they came back
   in after receiving the campaign). Also updates the campaign's `converted`
   counter. Called from the dashboard when viewing campaigns.

## Security
- Both functions are SECURITY DEFINER so the service-role edge function can
  call them. They are safe: `increment_campaign_opened` only increments an
  integer; `recompute_campaign_conversions` only reads and updates owned data.
- `recompute_campaign_conversions` is callable by authenticated users for
  their own campaigns.
*/

-- Atomic increment of campaign.opened
CREATE OR REPLACE FUNCTION increment_campaign_opened(campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE campaigns
  SET opened = opened + 1
  WHERE id = campaign_id;
END;
$$;

-- Recompute conversions for a campaign:
-- a recipient is "converted" if their last_visit_date is more recent than
-- the email send date (they came back after receiving the email).
CREATE OR REPLACE FUNCTION recompute_campaign_conversions(campaign_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  converted_count integer;
BEGIN
  -- Mark recipients as converted where the client's last_visit_date
  -- is after the email was sent AND they haven't been marked yet
  UPDATE campaign_recipients cr
  SET converted = true,
      converted_at = now()
  FROM clients c
  WHERE cr.client_id = c.id
    AND cr.campaign_id = recompute_campaign_conversions.campaign_id
    AND cr.converted = false
    AND c.last_visit_date IS NOT NULL
    AND c.last_visit_date >= cr.sent_at::date;

  -- Count total converted for this campaign
  SELECT count(*) INTO converted_count
  FROM campaign_recipients
  WHERE campaign_id = recompute_campaign_conversions.campaign_id
    AND converted = true;

  -- Update the campaign's converted counter
  UPDATE campaigns
  SET converted = converted_count
  WHERE id = recompute_campaign_conversions.campaign_id;

  RETURN converted_count;
END;
$$;