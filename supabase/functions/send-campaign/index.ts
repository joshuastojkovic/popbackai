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

    // ── Review Booster mode ──────────────────────────────────────────────
    if (body.reviewBooster) {
      // Get the user's Google review URL from their profile
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("google_review_url, business_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.google_review_url) {
        return new Response(JSON.stringify({ error: "No Google review URL saved. Add your link in Review Booster settings first." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch active clients (visited within 60 days) who haven't been asked for a review yet
      const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().split("T")[0];
      const { data: clients, error: clientErr } = await supabase
        .from("clients")
        .select("id, name, email")
        .not("email", "is", null)
        .gte("last_visit_date", cutoff)
        .eq("review_requested", false);

      if (clientErr) {
        return new Response(JSON.stringify({ error: "Failed to fetch clients" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const emailClients = (clients ?? []).filter((c) => c.email);
      if (emailClients.length === 0) {
        return new Response(JSON.stringify({ sent: 0, message: "No eligible clients to ask for reviews right now." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
      const businessName = profile.business_name ?? "us";
      let sentCount = 0;
      const errors: string[] = [];
      const sentIds: string[] = [];

      for (const client of emailClients) {
        const subject = `How was your visit to ${businessName}?`;
        const textBody = `Hi ${client.name},\n\nThank you for visiting ${businessName} recently. We'd love to hear about your experience!\n\nIf you enjoyed your visit, could you take 30 seconds to leave us a Google review? It really helps us grow:\n${profile.google_review_url}\n\nIf something wasn't right, just reply to this email and we'll make it right.\n\nThank you,\n${businessName}`;

        const emailPayload = {
          from: "hello@popbackai.com",
          to: client.email,
          subject,
          text: textBody,
          html: textBody.replace(/\n/g, "<br>"),
        };

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        if (res.ok) {
          sentCount++;
          sentIds.push(client.id);
        } else {
          const errBody = await res.text();
          errors.push(`${client.email}: ${errBody}`);
        }
      }

      // Mark clients as review_requested
      if (sentIds.length > 0) {
        await supabase
          .from("clients")
          .update({ review_requested: true, review_requested_at: new Date().toISOString() })
          .in("id", sentIds);
      }

      return new Response(
        JSON.stringify({ sent: sentCount, total: emailClients.length, errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Campaign mode (existing) ──────────────────────────────────────────
    const { campaignId } = body;
    if (!campaignId) {
      return new Response(JSON.stringify({ error: "campaignId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract user ID from the auth token so we can set user_id on recipient rows.
    // The service role key bypasses RLS but auth.uid() returns NULL, so the
    // DEFAULT auth.uid() on user_id would violate NOT NULL — we set it explicitly.
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const segmentDays: Record<string, number> = {
      lapsed_60: 60,
      lapsed_90: 90,
      lapsed_180: 180,
      lapsed_365: 365,
      all_lapsed: 60,
    };
    const minDays = segmentDays[campaign.target_segment] ?? 60;
    const cutoff = new Date(Date.now() - minDays * 86400000).toISOString().split("T")[0];

    let query = supabase
      .from("clients")
      .select("id, name, email")
      .not("email", "is", null)
      .lte("last_visit_date", cutoff);

    if (campaign.target_segment !== "all_lapsed") {
      const nextTier: Record<string, number> = {
        lapsed_60: 90,
        lapsed_90: 180,
        lapsed_180: 365,
      };
      const maxDays = nextTier[campaign.target_segment];
      if (maxDays) {
        const upperCutoff = new Date(Date.now() - maxDays * 86400000).toISOString().split("T")[0];
        query = query.gte("last_visit_date", upperCutoff);
      }
    }

    const { data: clients, error: clientErr } = await query;

    if (clientErr) {
      return new Response(JSON.stringify({ error: "Failed to fetch clients" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailClients = (clients ?? []).filter((c) => c.email);
    if (emailClients.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No clients with emails in this segment" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
    const baseUrl = Deno.env.get("SUPABASE_URL")!.replace(".supabase.co", ".supabase.co");
    const appUrl = Deno.env.get("APP_URL") ?? "https://popbackai.com";

    // Step 1: Create recipient rows first so we have IDs for unsubscribe links
    const recipientInserts = emailClients.map((c) => ({
      campaign_id: campaignId,
      client_id: c.id,
      user_id: userId ?? campaign.user_id,
      sent_at: new Date().toISOString(),
    }));

    let recipientIds: string[] = [];
    const CHUNK = 500;
    for (let i = 0; i < recipientInserts.length; i += CHUNK) {
      const { data: inserted, error: insErr } = await supabase
        .from("campaign_recipients")
        .insert(recipientInserts.slice(i, i + CHUNK))
        .select("id");
      if (insErr) {
        return new Response(
          JSON.stringify({ error: `Failed to create tracking records: ${insErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      recipientIds.push(...(inserted ?? []).map((r: { id: string }) => r.id));
    }

    // Step 2: Send emails with unsubscribe links
    let sentCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < emailClients.length; i++) {
      const client = emailClients[i];
      const recipientId = recipientIds[i];
      const personalised = (campaign.message_body ?? "").replace(/\[Name\]/g, client.name ?? "there");
      const unsubscribeUrl = `${appUrl}/unsubscribe?token=${recipientId}`;

      const textBody = personalised + `\n\n---\nDon't want these emails? Unsubscribe: ${unsubscribeUrl}`;
      const htmlBody = personalised.replace(/\n/g, "<br>") +
        `<br><br><div style="margin-top:20px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#999;">` +
        `Don't want these emails? <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a></div>`;

      const emailPayload = {
        from: "hello@popbackai.com",
        to: client.email,
        subject: campaign.message_subject ?? "A message from us",
        text: textBody,
        html: htmlBody,
      };

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      if (res.ok) {
        sentCount++;
        const resBody = await res.json();
        const resendEmailId = resBody.id ?? null;
        if (!resendEmailId) {
          console.warn("Resend did not return an email ID for recipient", recipientId);
        }
        const { error: idUpdateError } = await supabase
          .from("campaign_recipients")
          .update({ resend_email_id: resendEmailId })
          .eq("id", recipientId);
        if (idUpdateError) {
          console.error("Failed to save resend_email_id for recipient", recipientId, idUpdateError);
        }
      } else {
        const errBody = await res.text();
        errors.push(`${client.email}: ${errBody}`);
        // Remove the recipient row since the email failed
        await supabase.from("campaign_recipients").delete().eq("id", recipientId);
      }
    }

    console.log("Campaign sent:", { campaignId, sentCount, recipientRows: recipientIds.length, errors });

    await supabase
      .from("campaigns")
      .update({
        status: "active",
        sent: (campaign.sent ?? 0) + sentCount,
        recipient_count: emailClients.length,
        launched_at: campaign.launched_at ?? new Date().toISOString(),
      })
      .eq("id", campaignId);

    return new Response(
      JSON.stringify({ sent: sentCount, total: emailClients.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
