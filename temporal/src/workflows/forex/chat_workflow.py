from __future__ import annotations
import uuid
from datetime import timedelta

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from ...activities.bedrock import call_bedrock_chat, FOREX_SYSTEM_PROMPT
    from ...activities.supabase_forex import (
        store_chat_message,
        get_conversation_history,
        get_pair_facts,
        get_all_pair_entities,
    )


@workflow.defn
class ChatWorkflow:
    """On-demand. Runs the Claude Bedrock agentic chat loop for forex conversations."""

    @workflow.run
    async def run(self, input: dict) -> dict:
        user_id = input["user_id"]
        conversation_id = input.get("conversation_id") or str(uuid.uuid4())
        message = input["message"]

        await workflow.execute_activity(
            store_chat_message,
            args=[user_id, conversation_id, "user", message, None, None],
            start_to_close_timeout=timedelta(seconds=15),
        )

        history = await workflow.execute_activity(
            get_conversation_history,
            args=[conversation_id, 20],
            start_to_close_timeout=timedelta(seconds=15),
        )

        context_summary = ""
        pair_context = input.get("context", {}).get("pair_entity_id")
        if pair_context:
            facts = await workflow.execute_activity(
                get_pair_facts,
                args=[pair_context],
                start_to_close_timeout=timedelta(seconds=15),
            )
            if facts:
                lines = [f"  {k}: {v['value']} {v.get('unit', '')}" for k, v in facts.items()]
                context_summary = "\n\nCurrent market data for the referenced pair:\n" + "\n".join(lines)

        system_prompt = FOREX_SYSTEM_PROMPT + context_summary

        messages = [{"role": m["role"], "content": m["content"]} for m in history]

        result = await workflow.execute_activity(
            call_bedrock_chat,
            args=[system_prompt, messages, None],
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=workflow.RetryPolicy(maximum_attempts=2),
        )

        response_text = result.get("content", "")
        tokens_used = result.get("tokens_used", 0)
        model = result.get("model", "")

        await workflow.execute_activity(
            store_chat_message,
            args=[user_id, conversation_id, "assistant", response_text, model, tokens_used],
            start_to_close_timeout=timedelta(seconds=15),
        )

        return {
            "response": response_text,
            "conversation_id": conversation_id,
            "tokens_used": tokens_used,
            "model": model,
        }
