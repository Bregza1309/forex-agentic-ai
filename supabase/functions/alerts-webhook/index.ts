import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const WEBHOOK_SECRET = Deno.env.get("ALERTS_WEBHOOK_SECRET") ?? "";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const secret = req.headers.get("x-webhook-secret");
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userId = body.user_id;
  const alertId = body.alert_id;
  const pair = body.pair;
  const message = body.message;

  if (!userId || !alertId || !message) {
    return new Response(
      JSON.stringify({ error: "user_id, alert_id, and message are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { error: insertError } = await supabase.from("notifications").insert({
    user_id: userId,
    alert_id: alertId,
    pair: pair ?? null,
    message,
    is_read: false,
  });

  if (insertError) {
    return new Response(
      JSON.stringify({ error: "Failed to insert notification", details: insertError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ status: "notification_created" }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
