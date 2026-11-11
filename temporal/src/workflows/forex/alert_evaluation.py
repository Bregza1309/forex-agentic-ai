from __future__ import annotations
from datetime import timedelta

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from ...activities.supabase_forex import (
        get_active_alerts,
        get_pair_facts,
        trigger_alert_notification,
    )


CONDITION_EVALUATORS = {
    "price_cross_above": lambda value, threshold: value > threshold,
    "price_cross_below": lambda value, threshold: value < threshold,
    "rsi_overbought": lambda value, threshold: value > threshold,
    "rsi_oversold": lambda value, threshold: value < threshold,
    "volatility_spike": lambda value, threshold: value > threshold,
}


@workflow.defn
class AlertEvaluationWorkflow:
    """Scheduled every 5 min. Evaluates alert conditions against latest entity_facts."""

    @workflow.run
    async def run(self) -> dict:
        alerts = await workflow.execute_activity(
            get_active_alerts,
            start_to_close_timeout=timedelta(seconds=30),
        )

        triggered_ids: list[str] = []

        for alert in alerts:
            pair_entity_id = alert.get("pair_entity_id")
            if not pair_entity_id:
                continue

            facts = await workflow.execute_activity(
                get_pair_facts,
                args=[pair_entity_id],
                start_to_close_timeout=timedelta(seconds=15),
            )

            fact_key = alert.get("fact_type_key", "exchange_rate")
            fact_data = facts.get(fact_key)
            if not fact_data:
                continue

            current_value = float(fact_data.get("value", 0))
            threshold = float(alert.get("threshold", 0))
            condition_type = alert.get("condition_type", "")

            evaluator = CONDITION_EVALUATORS.get(condition_type)
            if not evaluator:
                continue

            if evaluator(current_value, threshold):
                alert_id = alert["alert_entity_id"]
                message = f"Alert triggered: {condition_type} — current {fact_key}={current_value}, threshold={threshold}"

                await workflow.execute_activity(
                    trigger_alert_notification,
                    args=[alert_id, pair_entity_id, message],
                    start_to_close_timeout=timedelta(seconds=15),
                )
                triggered_ids.append(alert_id)

        return {
            "alerts_checked": len(alerts),
            "alerts_triggered": len(triggered_ids),
            "triggered_ids": triggered_ids,
        }
