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

  const riskProfile =
    typeof body.risk_profile === "string" ? body.risk_profile : null;
  const workflowId = `recommend-${user.id}-${Date.now()}`;

  const result = await startWorkflow(workflowId, "RecommendWorkflow", {
    user_id: user.id,
    risk_profile: riskProfile,
  });

  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to start recommendation workflow", details: result.error }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      workflow_id: workflowId,
      status: "processing",
    }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
