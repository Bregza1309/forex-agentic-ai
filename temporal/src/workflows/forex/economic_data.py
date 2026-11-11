from __future__ import annotations
from datetime import timedelta

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from ...activities.forex_data import fetch_fred_indicators, fetch_ecb_rates
    from ...activities.supabase_forex import upsert_price_data


@workflow.defn
class EconomicDataWorkflow:
    """Scheduled every 1 hour. Pulls economic indicators from FRED and ECB/Frankfurter APIs."""

    @workflow.run
    async def run(self) -> dict:
        fred_data = await workflow.execute_activity(
            fetch_fred_indicators,
            args=[["DFF", "CPIAUCSL", "GDP", "UNRATE", "T10Y2Y"]],
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=workflow.RetryPolicy(maximum_attempts=3),
        )

        ecb_rates = await workflow.execute_activity(
            fetch_ecb_rates,
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=workflow.RetryPolicy(maximum_attempts=2),
        )

        ecb_inserted = 0
        if ecb_rates:
            ecb_inserted = await workflow.execute_activity(
                upsert_price_data,
                args=[ecb_rates],
                start_to_close_timeout=timedelta(seconds=120),
            )

        return {
            "fred_indicators_fetched": len(fred_data),
            "ecb_rates_inserted": ecb_inserted,
        }
