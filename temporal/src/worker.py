from __future__ import annotations
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from temporalio.client import Client
from temporalio.worker import Worker

from .config import settings
from .activities import supabase_core, notifications
from .activities import bedrock, forex_data, supabase_forex, technical_analysis
from .workflows.example.approval_workflow import ApprovalWorkflow
from .workflows.forex import (
    PriceIngestionWorkflow,
    TechnicalIndicatorWorkflow,
    ChatWorkflow,
    AlertEvaluationWorkflow,
    RecommendWorkflow,
    AnalyzeWorkflow,
    SentimentIngestionWorkflow,
    EconomicDataWorkflow,
    PortfolioSnapshotWorkflow,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main() -> None:
    logger.info("Connecting to Temporal address=%s namespace=%s", settings.temporal_address, settings.temporal_namespace)
    client = await Client.connect(settings.temporal_address, namespace=settings.temporal_namespace)

    activity_executor = ThreadPoolExecutor(max_workers=20)
    worker = Worker(
        client,
        task_queue=settings.temporal_task_queue,
        workflows=[
            ApprovalWorkflow,
            PriceIngestionWorkflow,
            TechnicalIndicatorWorkflow,
            ChatWorkflow,
            AlertEvaluationWorkflow,
            RecommendWorkflow,
            AnalyzeWorkflow,
            SentimentIngestionWorkflow,
            EconomicDataWorkflow,
            PortfolioSnapshotWorkflow,
        ],
        activities=[
            # Template activities
            supabase_core.create_entity,
            supabase_core.update_entity_scd2,
            supabase_core.get_entity,
            supabase_core.append_event,
            supabase_core.create_relationship,
            notifications.send_email,
            notifications.send_notification,
            # Bedrock activities
            bedrock.call_bedrock_chat,
            bedrock.call_bedrock_analysis,
            bedrock.score_sentiment,
            # Forex data activities
            forex_data.fetch_prices_yfinance,
            forex_data.fetch_prices_alpha_vantage,
            forex_data.fetch_ecb_rates,
            forex_data.fetch_fred_indicators,
            forex_data.fetch_news_headlines,
            # Supabase forex activities
            supabase_forex.upsert_price_data,
            supabase_forex.upsert_entity_fact,
            supabase_forex.get_active_alerts,
            supabase_forex.get_pair_facts,
            supabase_forex.get_all_pair_entities,
            supabase_forex.get_price_history,
            supabase_forex.store_chat_message,
            supabase_forex.get_conversation_history,
            supabase_forex.get_user_profile,
            supabase_forex.trigger_alert_notification,
            # Technical analysis
            technical_analysis.compute_technical_indicators,
        ],
        activity_executor=activity_executor,
    )

    logger.info("Worker started task_queue=%s", settings.temporal_task_queue)
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
