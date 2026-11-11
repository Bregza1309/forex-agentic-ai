from __future__ import annotations
import json
from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from ...activities.bedrock import call_bedrock_analysis
    from ...activities.supabase_forex import get_pair_facts, get_price_history


@workflow.defn
class AnalyzeWorkflow:
    """On-demand. Gathers pair facts + time series, calls Claude for narrative market analysis."""

    @workflow.run
    async def run(self, input: dict) -> dict:
        pair = input.get("pair", "")
        pair_entity_id = input.get("pair_entity_id", "")
        timeframe = input.get("timeframe", "daily")

        facts = await workflow.execute_activity(
            get_pair_facts,
            args=[pair_entity_id],
            start_to_close_timeout=timedelta(seconds=15),
        )

        history = await workflow.execute_activity(
            get_price_history,
            args=[pair_entity_id, 50],
            start_to_close_timeout=timedelta(seconds=30),
        )

        facts_text = "\n".join(f"  {k}: {v['value']} {v.get('unit', '')}" for k, v in facts.items()) if facts else "No facts available."

        recent_prices = []
        for point in history[:10]:
            data = point.get("data", {})
            recent_prices.append(f"  {point.get('observed_at', 'N/A')}: mid={data.get('mid', 'N/A')}")
        prices_text = "\n".join(recent_prices) if recent_prices else "No price history available."

        prompt = (
            f"Provide a concise market analysis for {pair} on the {timeframe} timeframe.\n\n"
            f"Current indicators:\n{facts_text}\n\n"
            f"Recent price data (newest first):\n{prices_text}\n\n"
            "Include:\n"
            "1. Current trend direction and strength\n"
            "2. Key support and resistance levels based on recent prices\n"
            "3. Technical indicator interpretation (RSI, MACD, moving averages)\n"
            "4. A brief outlook (bullish, bearish, or neutral) with reasoning\n"
            "5. Risk factors to watch\n\n"
            "Keep the analysis under 300 words. Disclaimer: this is not financial advice."
        )

        result = await workflow.execute_activity(
            call_bedrock_analysis,
            args=[
                "You are a professional forex market analyst. Provide data-driven analysis grounded in the indicators provided. Never invent numbers.",
                [{"role": "user", "content": prompt}],
            ],
            start_to_close_timeout=timedelta(seconds=90),
            retry_policy=RetryPolicy(maximum_attempts=2),
        )

        return {
            "narrative": result.get("content", ""),
            "indicators": facts,
            "model": result.get("model", ""),
            "tokens_used": result.get("tokens_used", 0),
        }
