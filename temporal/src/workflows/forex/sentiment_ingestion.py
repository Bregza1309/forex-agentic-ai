from __future__ import annotations
from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from ...activities.forex_data import fetch_news_headlines
    from ...activities.bedrock import score_sentiment
    from ...activities.supabase_forex import get_all_pair_entities, upsert_entity_fact


@workflow.defn
class SentimentIngestionWorkflow:
    """Scheduled every 1 hour. Fetches news, scores sentiment via Claude, stores as entity_facts."""

    @workflow.run
    async def run(self) -> dict:
        headlines_data = await workflow.execute_activity(
            fetch_news_headlines,
            args=["forex OR currency exchange OR FX market"],
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=RetryPolicy(maximum_attempts=2),
        )

        if not headlines_data:
            return {"headlines_fetched": 0, "pairs_scored": 0}

        headlines = [h["headline"] for h in headlines_data if h.get("headline")]

        sentiment = await workflow.execute_activity(
            score_sentiment,
            args=[headlines],
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=RetryPolicy(maximum_attempts=2),
        )

        overall_score = sentiment.get("score", 0.0)

        pairs = await workflow.execute_activity(
            get_all_pair_entities,
            start_to_close_timeout=timedelta(seconds=30),
        )

        scored = 0
        for pair in pairs:
            await workflow.execute_activity(
                upsert_entity_fact,
                args=[pair["id"], "sentiment_score", overall_score, {
                    "source": "news_api",
                    "volume": sentiment.get("volume", 0),
                }],
                start_to_close_timeout=timedelta(seconds=15),
            )
            scored += 1

        return {"headlines_fetched": len(headlines), "pairs_scored": scored, "overall_sentiment": overall_score}
