from __future__ import annotations
from datetime import timedelta

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from ...activities.forex_data import fetch_prices_yfinance, fetch_prices_alpha_vantage, fetch_ecb_rates
    from ...activities.supabase_forex import upsert_price_data


@workflow.defn
class PriceIngestionWorkflow:
    """Scheduled every 15 min. Fetches prices from yfinance (primary) + Alpha Vantage (supplementary)."""

    @workflow.run
    async def run(self) -> dict:
        yf_prices = await workflow.execute_activity(
            fetch_prices_yfinance,
            args=[None],
            start_to_close_timeout=timedelta(seconds=120),
            retry_policy=workflow.RetryPolicy(maximum_attempts=3),
        )

        ecb_prices = await workflow.execute_activity(
            fetch_ecb_rates,
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=workflow.RetryPolicy(maximum_attempts=2),
        )

        all_prices = yf_prices + ecb_prices
        inserted = 0
        if all_prices:
            inserted = await workflow.execute_activity(
                upsert_price_data,
                args=[all_prices],
                start_to_close_timeout=timedelta(seconds=120),
                retry_policy=workflow.RetryPolicy(maximum_attempts=3),
            )

        return {"pairs_updated": inserted, "yfinance_count": len(yf_prices), "ecb_count": len(ecb_prices)}
