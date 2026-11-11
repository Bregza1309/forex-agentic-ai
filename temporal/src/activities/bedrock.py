from __future__ import annotations
import json
import logging
from typing import Any

import boto3
from temporalio import activity

from ..config import settings

logger = logging.getLogger(__name__)

FOREX_SYSTEM_PROMPT = (
    "You are a forex trading assistant powered by AI. You help users understand "
    "currency markets, analyze pairs, and make informed decisions. You provide "
    "educational content for beginners and analytical insights for experienced traders. "
    "Always include a disclaimer that your output is not financial advice. "
    "Be concise and data-driven when presenting market analysis."
)


def _get_bedrock_client() -> Any:
    return boto3.client("bedrock-runtime", region_name=settings.aws_region)


@activity.defn
async def call_bedrock_chat(
    system_prompt: str,
    messages: list[dict],
    model: str | None = None,
) -> dict:
    """Call Claude on Bedrock via the Converse API. Returns content, token count, and model used."""
    resolved_model = model or settings.bedrock_model_chat
    client = _get_bedrock_client()

    converse_messages = []
    for msg in messages:
        converse_messages.append({
            "role": msg.get("role", "user"),
            "content": [{"text": msg.get("content", "")}],
        })

    try:
        response = client.converse(
            modelId=resolved_model,
            system=[{"text": system_prompt}],
            messages=converse_messages,
            inferenceConfig={"maxTokens": 4096, "temperature": 0.7},
        )

        output_text = ""
        for block in response.get("output", {}).get("message", {}).get("content", []):
            if "text" in block:
                output_text += block["text"]

        usage = response.get("usage", {})
        tokens_used = usage.get("inputTokens", 0) + usage.get("outputTokens", 0)

        logger.info("bedrock_chat_complete model=%s tokens=%d", resolved_model, tokens_used)
        return {"content": output_text, "tokens_used": tokens_used, "model": resolved_model}

    except Exception as exc:
        logger.error("bedrock_chat_failed model=%s error=%s", resolved_model, str(exc))
        raise


@activity.defn
async def call_bedrock_analysis(
    system_prompt: str,
    messages: list[dict],
) -> dict:
    """Call Claude Bedrock with the analysis-grade model (Sonnet). Returns content, token count, model."""
    return await call_bedrock_chat(system_prompt, messages, model=settings.bedrock_model_analysis)


@activity.defn
async def score_sentiment(headlines: list[str]) -> dict:
    """Use Claude to classify a batch of headlines into a sentiment score from -1.0 to 1.0."""
    if not headlines:
        return {"score": 0.0, "volume": 0, "details": []}

    prompt_text = (
        "Analyze the following forex-related headlines and return a JSON object with:\n"
        '- "score": a float from -1.0 (very bearish) to 1.0 (very bullish)\n'
        '- "details": a list of objects, each with "headline" and "sentiment" (-1.0 to 1.0)\n\n'
        "Headlines:\n" + "\n".join(f"- {h}" for h in headlines)
    )

    result = await call_bedrock_chat(
        system_prompt="You are a financial sentiment analyst. Respond only with valid JSON.",
        messages=[{"role": "user", "content": prompt_text}],
        model=settings.bedrock_model_chat,
    )

    try:
        parsed = json.loads(result["content"])
        score = float(parsed.get("score", 0.0))
        score = max(-1.0, min(1.0, score))
        details = parsed.get("details", [])
    except (json.JSONDecodeError, ValueError):
        logger.warning("sentiment_parse_failed, defaulting to neutral")
        score = 0.0
        details = []

    return {"score": score, "volume": len(headlines), "details": details}
