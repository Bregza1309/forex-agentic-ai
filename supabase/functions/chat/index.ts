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

  const message = body.message;
  if (!message || typeof message !== "string") {
    return new Response(
      JSON.stringify({ error: "message is required and must be a string" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const conversationId =
    typeof body.conversation_id === "string" ? body.conversation_id : crypto.randomUUID();
  const workflowId = `chat-${user.id}-${conversationId}-${Date.now()}`;

  const result = await startWorkflow(workflowId, "ChatWorkflow", {
    user_id: user.id,
    conversation_id: conversationId,
    message,
    context: body.context ?? null,
  });

  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to start chat workflow", details: result.error }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      workflow_id: workflowId,
      conversation_id: conversationId,
      status: "processing",
    }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
