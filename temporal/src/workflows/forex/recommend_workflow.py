from __future__ import annotations
import json
from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from ...activities.bedrock import call_bedrock_chat
    from ...activities.supabase_forex import get_all_pair_entities, get_pair_facts, get_user_profile


@workflow.defn
class RecommendWorkflow:
    """On-demand. Gathers user profile + all pair facts, calls Claude to rank and justify recommendations."""

    @workflow.run
    async def run(self, input: dict) -> dict:
        user_id = input.get("user_id", "")
        risk_profile = input.get("risk_profile")
        max_recs = input.get("max_recommendations", 5)

        profile = {}
        if user_id:
            profile = await workflow.execute_activity(
                get_user_profile,
                args=[user_id],
                start_to_close_timeout=timedelta(seconds=15),
            )

        if not risk_profile:
            risk_profile = profile.get("risk_tolerance", "moderate")

        experience_level = profile.get("experience_level", "beginner")

        pairs = await workflow.execute_activity(
            get_all_pair_entities,
            start_to_close_timeout=timedelta(seconds=30),
        )

        pair_summaries: list[str] = []
        for pair in pairs:
            facts = await workflow.execute_activity(
                get_pair_facts,
                args=[pair["id"]],
                start_to_close_timeout=timedelta(seconds=15),
            )
            if not facts:
                continue

            summary_parts = [f"Pair: {pair['source_record_id']}"]
            for key, data in facts.items():
                summary_parts.append(f"  {key}: {data['value']} {data.get('unit', '')}")
            pair_summaries.append("\n".join(summary_parts))

        market_context = "\n\n".join(pair_summaries) if pair_summaries else "No market data available."

        prompt = (
            f"The user is a {experience_level} trader with a {risk_profile} risk profile.\n\n"
            f"Current market data for available currency pairs:\n{market_context}\n\n"
            f"Based on this data, recommend the top {max_recs} currency pairs for this user. "
            "For each recommendation provide:\n"
            '- "pair": the pair code (e.g. "EURUSD")\n'
            '- "rationale": 2-3 sentences explaining why this pair suits the user\n'
            '- "confidence": a float from 0.0 to 1.0\n'
            '- "risk_level": "low", "moderate", or "high"\n\n'
            "Respond with valid JSON: a list of recommendation objects. "
            "Include a disclaimer that this is not financial advice."
        )

        result = await workflow.execute_activity(
            call_bedrock_chat,
            args=[
                "You are a forex recommendation engine. Respond only with valid JSON.",
                [{"role": "user", "content": prompt}],
                None,
            ],
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=RetryPolicy(maximum_attempts=2),
        )

        content = result.get("content", "[]")
        try:
            recommendations = json.loads(content)
            if isinstance(recommendations, dict):
                recommendations = recommendations.get("recommendations", [])
        except json.JSONDecodeError:
            recommendations = [{"pair": "EURUSD", "rationale": content, "confidence": 0.5, "risk_level": "low"}]

        return {
            "recommendations": recommendations[:max_recs],
            "model": result.get("model", ""),
            "tokens_used": result.get("tokens_used", 0),
        }
