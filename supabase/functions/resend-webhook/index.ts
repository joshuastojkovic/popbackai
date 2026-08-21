import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const eventType = body.type as string | undefined;
    const emailId = body.data?.email_id as string | undefined;

    // Log every webhook event for debugging
    await supabase.from("webhook_events").insert({
      event_type: eventType ?? "unknown",
      email_id: emailId ?? null,
      raw_payload: body,
    });

    if (!eventType || !emailId) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "missing eventType or emailId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process open events
    if (eventType !== "email.opened") {
      return new Response(JSON.stringify({ ok: true, skipped: true, event: eventType }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the recipient record by resend email ID
    const { data: recipient, error: rcpErr } = await supabase
      .from("campaign_recipients")
      .select("id, campaign_id, opened")
      .eq("resend_email_id", emailId)
      .maybeSingle();

    // Update the log with whether we matched
    if (rcpErr || !recipient) {
      await supabase.from("webhook_events").update({ matched: false }).eq("email_id", emailId);
      return new Response(JSON.stringify({ ok: true, notFound: true, emailId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("webhook_events").update({ matched: true }).eq("email_id", emailId);

    // Already marked as opened — skip to avoid double counting
    if (recipient.opened) {
      return new Response(JSON.stringify({ ok: true, alreadyOpened: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark recipient as opened
    await supabase
      .from("campaign_recipients")
      .update({ opened: true, opened_at: new Date().toISOString() })
      .eq("id", recipient.id);

    // Increment campaign opened counter
    await supabase.rpc("increment_campaign_opened", { campaign_id: recipient.campaign_id });

    return new Response(JSON.stringify({ ok: true, opened: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
