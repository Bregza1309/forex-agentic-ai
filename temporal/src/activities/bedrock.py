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


def _bedrock_configured() -> bool:
    return bool(settings.aws_region and _get_aws_key())


def _get_aws_key() -> str:
    import os
    return os.environ.get("AWS_ACCESS_KEY_ID", "").strip()


_FALLBACK_RESPONSES: dict[str, str] = {
    "beginner": (
        "Great question! Here are some tips for getting started with forex trading:\n\n"
        "1. **Start with major pairs** like EUR/USD, GBP/USD, and USD/JPY — they have the tightest spreads and most liquidity.\n"
        "2. **Learn key indicators**: RSI (Relative Strength Index) shows if a pair is overbought (>70) or oversold (<30). "
        "MACD helps spot trend changes.\n"
        "3. **Practice risk management**: Never risk more than 1-2% of your account on a single trade.\n"
        "4. **Use a demo account** before trading real money.\n\n"
        "Check the Dashboard tab to see live prices for all major pairs, and the Learn tab for educational modules.\n\n"
        "*Disclaimer: This is educational content, not financial advice.*"
    ),
    "analysis": (
        "Here's a quick market overview based on current data:\n\n"
        "The major pairs are showing mixed signals today. Key things to watch:\n"
        "- **EUR/USD**: The most traded pair globally, influenced by ECB and Fed policy divergence\n"
        "- **GBP/USD**: Watch for UK economic data releases\n"
        "- **USD/JPY**: Sensitive to interest rate differentials between the US and Japan\n\n"
        "For deeper analysis, check the Dashboard for live RSI and sentiment indicators on each pair.\n\n"
        "*Disclaimer: This is educational content, not financial advice.*"
    ),
    "default": (
        "I'm your Forex AI Assistant! I can help you with:\n\n"
        "- **Market analysis**: Ask about any currency pair\n"
        "- **Education**: Learn about forex concepts, indicators, and strategies\n"
        "- **Risk management**: Understand position sizing and stop losses\n"
        "- **Pair recommendations**: Get suggestions based on your experience level\n\n"
        "Try asking me something like 'What pairs should a beginner trade?' or 'Analyze EUR/USD'.\n\n"
        "**Note**: AWS Bedrock credentials are not configured yet. Once connected, I'll provide "
        "real-time AI-powered analysis using Claude. For now, I'm using built-in responses.\n\n"
        "*Disclaimer: This is educational content, not financial advice.*"
    ),
}


def _generate_fallback(messages: list[dict]) -> dict:
    last_msg = messages[-1].get("content", "").lower() if messages else ""
    if any(w in last_msg for w in ("beginner", "start", "new", "learn", "first")):
        key = "beginner"
    elif any(w in last_msg for w in ("analyz", "market", "eur", "gbp", "usd", "jpy", "pair")):
        key = "analysis"
    else:
        key = "default"
    return {"content": _FALLBACK_RESPONSES[key], "tokens_used": 0, "model": "fallback"}


@activity.defn
async def call_bedrock_chat(
    system_prompt: str,
    messages: list[dict],
    model: str | None = None,
) -> dict:
    """Call Claude on Bedrock via the Converse API. Returns content, token count, and model used."""
    if not _bedrock_configured():
        logger.warning("bedrock_not_configured using_fallback=true")
        return _generate_fallback(messages)

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
            inferenceConfig={"maxTokens": 4096},
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
        logger.error("bedrock_chat_failed model=%s error=%s, using fallback", resolved_model, str(exc))
        return _generate_fallback(messages)


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
