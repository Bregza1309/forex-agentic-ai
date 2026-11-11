from __future__ import annotations
from datetime import timedelta

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from ...activities.supabase_forex import get_all_pair_entities, get_pair_facts


@workflow.defn
class PortfolioSnapshotWorkflow:
    """Scheduled daily at 00:00 UTC. Snapshots portfolio values using closing prices."""

    @workflow.run
    async def run(self) -> dict:
        pairs = await workflow.execute_activity(
            get_all_pair_entities,
            start_to_close_timeout=timedelta(seconds=30),
        )

        closing_prices: dict[str, float] = {}
        for pair in pairs:
            facts = await workflow.execute_activity(
                get_pair_facts,
                args=[pair["id"]],
                start_to_close_timeout=timedelta(seconds=15),
            )
            rate_fact = facts.get("exchange_rate")
            if rate_fact:
                closing_prices[pair["source_record_id"]] = float(rate_fact["value"])

        return {"closing_prices_captured": len(closing_prices), "prices": closing_prices}
