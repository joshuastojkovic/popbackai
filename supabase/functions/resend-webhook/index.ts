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
    const emailId = payload?.data?.email_id as string | undefined;

    if (eventType !== "email.opened" || !emailId) {
      return jsonResponse({ ok: true, skipped: true });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: recipient, error: recipientError } = await supabase
      .from("campaign_recipients")
      .select("id, campaign_id, opened")
      .eq("resend_email_id", emailId)
      .maybeSingle();

    if (recipientError) {
      console.error("Failed to find campaign recipient", recipientError);
      return jsonResponse({ ok: false, error: "Failed to find campaign recipient" }, 500);
    }

    if (!recipient) {
      return jsonResponse({ ok: true, matched: false });
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
      return jsonResponse({ ok: false, error: "Failed to increment campaign opens" }, 500);
    }

    return jsonResponse({ ok: true, matched: true, opened: true });
  } catch (error) {
    console.error("Resend webhook error", error);
    return jsonResponse({ ok: false, error: "Invalid webhook request" }, 400);
  }
});
