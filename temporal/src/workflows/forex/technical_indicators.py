from __future__ import annotations
from datetime import timedelta

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from ...activities.supabase_forex import get_all_pair_entities, get_price_history, upsert_entity_fact
    from ...activities.technical_analysis import compute_technical_indicators


@workflow.defn
class TechnicalIndicatorWorkflow:
    """Scheduled every 15 min after price ingestion. Computes and stores technical indicators."""

    @workflow.run
    async def run(self) -> dict:
        pairs = await workflow.execute_activity(
            get_all_pair_entities,
            start_to_close_timeout=timedelta(seconds=30),
        )

        indicators_computed = 0
        for pair in pairs:
            entity_id = pair["id"]

            history = await workflow.execute_activity(
                get_price_history,
                args=[entity_id, 200],
                start_to_close_timeout=timedelta(seconds=30),
            )

            if len(history) < 15:
                continue

            indicators = await workflow.execute_activity(
                compute_technical_indicators,
                args=[entity_id, history],
                start_to_close_timeout=timedelta(seconds=60),
            )

            fact_map = {
                "rsi_14": indicators.get("rsi_14"),
                "macd_signal": indicators.get("macd_signal"),
                "sma_50": indicators.get("sma_50"),
                "sma_200": indicators.get("sma_200"),
            }

            for fact_key, value in fact_map.items():
                if value is not None:
                    await workflow.execute_activity(
                        upsert_entity_fact,
                        args=[entity_id, fact_key, value, {}],
                        start_to_close_timeout=timedelta(seconds=15),
                    )

            indicators_computed += 1

        return {"pairs_processed": indicators_computed}
