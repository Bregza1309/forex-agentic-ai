import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { startWorkflow } from "../_shared/temporal.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { user, error: authError } = await getUser(req);
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: authError ?? "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

  const pair = body.pair;
  if (!pair || typeof pair !== "string") {
    return new Response(
      JSON.stringify({ error: "pair is required and must be a string (e.g. 'EURUSD')" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const timeframe =
    typeof body.timeframe === "string" ? body.timeframe : "1D";
  const workflowId = `analyze-${pair}-${user.id}-${Date.now()}`;

  const result = await startWorkflow(workflowId, "AnalyzeWorkflow", {
    user_id: user.id,
    pair,
    timeframe,
  });

  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to start analysis workflow", details: result.error }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      workflow_id: workflowId,
      pair,
      timeframe,
      status: "processing",
    }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
