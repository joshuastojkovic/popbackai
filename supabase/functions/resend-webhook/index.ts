import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const eventType = payload?.type as string | undefined;

    const emailId =
      (payload?.data?.email_id as string | undefined) ??
      (payload?.data?.id as string | undefined) ??
      (payload?.email_id as string | undefined);

    const recipientEmail = payload?.data?.to?.[0] as string | undefined;
    const subject = payload?.data?.subject as string | undefined;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log every webhook event for debugging
    let logId: string | null = null;
    try {
      const { data: logRow } = await supabase.from("webhook_events").insert({
        event_type: eventType ?? "unknown",
        email_id: emailId ?? null,
        raw_payload: payload,
        matched: false,
      }).select("id").maybeSingle();
      logId = logRow?.id ?? null;
    } catch (logErr) {
      console.error("Failed to log webhook event", logErr);
    }

    if (eventType !== "email.opened" || !emailId) {
      return jsonResponse({ ok: true, skipped: true, eventType });
    }

    // Dedup: check if this email_id was already processed
    const { data: existingLog } = await supabase
      .from("webhook_events")
      .select("id, matched")
      .eq("email_id", emailId)
      .eq("event_type", "email.opened")
      .eq("matched", true)
      .limit(1)
      .maybeSingle();

    if (existingLog?.matched) {
      return jsonResponse({ ok: true, matched: true, alreadyOpened: true });
    }

    // Strategy 1: Match by resend_email_id in campaign_recipients
    const { data: recipient, error: recipientError } = await supabase
      .from("campaign_recipients")
      .select("id, campaign_id, opened")
      .eq("resend_email_id", emailId)
      .maybeSingle();

    if (recipientError) {
      console.error("Failed to find campaign recipient", recipientError);
    }

    if (recipient) {
      if (logId) {
        await supabase.from("webhook_events").update({ matched: true }).eq("id", logId);
      }

      if (recipient.opened) {
        return jsonResponse({ ok: true, matched: true, alreadyOpened: true });
      }

      const { error: updateError } = await supabase
        .from("campaign_recipients")
        .update({ opened: true, opened_at: new Date().toISOString() })
        .eq("id", recipient.id);

      if (updateError) {
        console.error("Failed to mark campaign recipient opened", updateError);
        return jsonResponse({ ok: false, error: "Failed to mark recipient opened" }, 500);
      }

      const { error: incrementError } = await supabase.rpc("increment_campaign_opened", {
        campaign_id: recipient.campaign_id,
      });

      if (incrementError) {
        console.error("Failed to increment campaign opens", incrementError);
      }

      return jsonResponse({ ok: true, matched: true, opened: true, strategy: "recipient_id" });
    }

    // Strategy 2: Match by subject line to find the most recent campaign
    if (subject) {
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("id, opened, message_subject, sent")
        .eq("message_subject", subject)
        .gt("sent", 0)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (campaignError) {
        console.error("Failed to find campaign by subject", campaignError);
      }

      if (campaign) {
        if (logId) {
          await supabase.from("webhook_events").update({ matched: true }).eq("id", logId);
        }

        const { error: incrementError } = await supabase.rpc("increment_campaign_opened", {
          campaign_id: campaign.id,
        });

        if (incrementError) {
          console.error("Failed to increment campaign opens by subject", incrementError);
          return jsonResponse({ ok: false, error: "Failed to increment campaign opens" }, 500);
        }

        console.log("Open counted via subject match:", { campaignId: campaign.id, subject, emailId });
        return jsonResponse({ ok: true, matched: true, opened: true, strategy: "subject_match", campaignId: campaign.id });
      }
    }

    // Strategy 3: Match by recipient email to client, then find most recent campaign
    // for that user that has been sent
    if (recipientEmail) {
      const { data: client } = await supabase
        .from("clients")
        .select("id, user_id")
        .eq("email", recipientEmail)
        .maybeSingle();

      if (client?.user_id) {
        const { data: recentCampaign } = await supabase
          .from("campaigns")
          .select("id, opened, sent")
          .eq("user_id", client.user_id)
          .gt("sent", 0)
          .order("launched_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (recentCampaign) {
          if (logId) {
            await supabase.from("webhook_events").update({ matched: true }).eq("id", logId);
          }

          const { error: incrementError } = await supabase.rpc("increment_campaign_opened", {
            campaign_id: recentCampaign.id,
          });

          if (incrementError) {
            console.error("Failed to increment campaign opens by email", incrementError);
            return jsonResponse({ ok: false, error: "Failed to increment campaign opens" }, 500);
          }

          console.log("Open counted via email match:", { campaignId: recentCampaign.id, recipientEmail, emailId });
          return jsonResponse({ ok: true, matched: true, opened: true, strategy: "email_match", campaignId: recentCampaign.id });
        }
      }
    }

    // No match at all
    console.log("No match found for open event:", { emailId, recipientEmail, subject });
    return jsonResponse({ ok: true, matched: false, emailId, recipientEmail, subject });
  } catch (error) {
    console.error("Resend webhook error", error);
    return jsonResponse({ ok: false, error: "Invalid webhook request" }, 400);
  }
});
