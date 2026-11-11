const TEMPORAL_API_URL =
  Deno.env.get("TEMPORAL_API_URL") ?? "http://host.docker.internal:7234";
const TEMPORAL_NAMESPACE =
  Deno.env.get("TEMPORAL_NAMESPACE") ?? "default";
const TEMPORAL_TASK_QUEUE =
  Deno.env.get("TEMPORAL_TASK_QUEUE") ?? "forex-main";

interface StartWorkflowResult {
  ok: boolean;
  workflowId: string;
  error?: string;
}

export async function startWorkflow(
  workflowId: string,
  workflowType: string,
  input: unknown,
): Promise<StartWorkflowResult> {
  const payload = JSON.stringify(input);
  const encodedPayload = btoa(payload);

  const body = {
    workflowId,
    workflowType: { name: workflowType },
    taskQueue: { name: TEMPORAL_TASK_QUEUE },
    input: {
      payloads: [
        {
          metadata: {
            encoding: btoa("json/plain"),
          },
          data: encodedPayload,
        },
      ],
    },
  };

  try {
    const resp = await fetch(
      `${TEMPORAL_API_URL}/api/v1/namespaces/${TEMPORAL_NAMESPACE}/workflows/${workflowId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!resp.ok) {
      const errText = await resp.text();
      return { ok: false, workflowId, error: errText };
    }

    return { ok: true, workflowId };
  } catch (err) {
    return { ok: false, workflowId, error: String(err) };
  }
}
