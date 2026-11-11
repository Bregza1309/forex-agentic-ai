from __future__ import annotations
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from supabase import create_client
from temporalio import activity

from ..config import settings

logger = logging.getLogger(__name__)


def _get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@activity.defn
async def upsert_price_data(prices: list[dict]) -> int:
    """Insert price ticks into time_series_points and upsert exchange_rate entity_facts."""
    sb = _get_supabase()
    inserted = 0

    exchange_rate_ft = sb.table("fact_types").select("id").eq("key", "exchange_rate").single().execute()
    if not exchange_rate_ft.data:
        logger.error("upsert_price_data_failed reason=exchange_rate_fact_type_not_found")
        return 0
    fact_type_id = exchange_rate_ft.data["id"]

    for price in prices:
        pair = price.get("pair", "")
        entity_resp = sb.table("entities").select("id").eq("entity_type", "currency_pair").eq("source_record_id", pair).single().execute()
        if not entity_resp.data:
            logger.warning("pair_entity_not_found pair=%s", pair)
            continue
        entity_id = entity_resp.data["id"]

        ts_row = {
            "entity_id": entity_id,
            "fact_type_id": fact_type_id,
            "observed_at": price.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "data": {
                "bid": price.get("bid"),
                "ask": price.get("ask"),
                "mid": price.get("mid"),
                "source": price.get("source", ""),
            },
            "source_id": price.get("source", ""),
        }
        sb.table("time_series_points").insert(ts_row).execute()

        spread_pips = round(abs(price.get("ask", 0) - price.get("bid", 0)) * 10000, 2)
        fact_row = {
            "entity_id": entity_id,
            "fact_type_id": fact_type_id,
            "value": price.get("mid", 0),
            "source_id": price.get("source", ""),
            "metadata": {"bid": price.get("bid"), "ask": price.get("ask"), "spread_pips": spread_pips},
        }
        sb.table("entity_facts").upsert(fact_row, on_conflict="entity_id,fact_type_id,dimension_id").execute()
        inserted += 1

    logger.info("upsert_price_data_complete inserted=%d", inserted)
    return inserted


@activity.defn
async def upsert_entity_fact(
    entity_id: str,
    fact_type_key: str,
    value: float,
    metadata: dict | None = None,
) -> str:
    """Upsert a single entity fact by fact_type key. Returns the fact row ID."""
    sb = _get_supabase()

    ft_resp = sb.table("fact_types").select("id").eq("key", fact_type_key).single().execute()
    if not ft_resp.data:
        logger.error("upsert_entity_fact_failed reason=fact_type_not_found key=%s", fact_type_key)
        return ""
    fact_type_id = ft_resp.data["id"]

    row = {
        "entity_id": entity_id,
        "fact_type_id": fact_type_id,
        "value": value,
        "metadata": metadata or {},
    }
    resp = sb.table("entity_facts").upsert(row, on_conflict="entity_id,fact_type_id,dimension_id").execute()
    fact_id = resp.data[0]["id"] if resp.data else ""
    logger.info("upsert_entity_fact_complete entity=%s fact_type=%s value=%f", entity_id, fact_type_key, value)
    return fact_id


@activity.defn
async def get_active_alerts() -> list[dict]:
    """Fetch all active alert entities with their latest version data."""
    sb = _get_supabase()

    alerts_resp = sb.table("entities").select("id, source_record_id").eq("entity_type", "alert").execute()
    if not alerts_resp.data:
        return []

    results: list[dict] = []
    for alert_entity in alerts_resp.data:
        version_resp = (
            sb.table("entity_versions")
            .select("data")
            .eq("entity_id", alert_entity["id"])
            .eq("is_current", True)
            .single()
            .execute()
        )
        if not version_resp.data:
            continue
        data = version_resp.data.get("data", {})
        if not data.get("is_active", False):
            continue

        rel_resp = (
            sb.table("relationships_v2")
            .select("child_id")
            .eq("parent_id", alert_entity["id"])
            .eq("relationship_type", "alert_watches_pair")
            .eq("is_current", True)
            .single()
            .execute()
        )
        pair_entity_id = rel_resp.data["child_id"] if rel_resp.data else None

        results.append({
            "alert_entity_id": alert_entity["id"],
            "pair_entity_id": pair_entity_id,
            "condition_type": data.get("condition_type", ""),
            "threshold": float(data.get("threshold", 0)),
            "fact_type_key": data.get("fact_type_key", "exchange_rate"),
        })

    logger.info("get_active_alerts_complete count=%d", len(results))
    return results


@activity.defn
async def get_pair_facts(pair_entity_id: str) -> dict:
    """Get all current entity_facts for a currency pair, keyed by fact_type key."""
    sb = _get_supabase()

    resp = (
        sb.table("entity_facts")
        .select("value, metadata, fact_types(key, label, unit)")
        .eq("entity_id", pair_entity_id)
        .execute()
    )

    facts: dict[str, Any] = {}
    for row in resp.data or []:
        ft = row.get("fact_types", {})
        key = ft.get("key", "")
        if key:
            facts[key] = {
                "value": row.get("value"),
                "unit": ft.get("unit", ""),
                "label": ft.get("label", ""),
                "metadata": row.get("metadata", {}),
            }

    logger.info("get_pair_facts_complete entity=%s fact_count=%d", pair_entity_id, len(facts))
    return facts


@activity.defn
async def get_all_pair_entities() -> list[dict]:
    """Get all currency pair entities."""
    sb = _get_supabase()
    resp = sb.table("entities").select("id, source_record_id").eq("entity_type", "currency_pair").execute()
    return resp.data or []


@activity.defn
async def get_price_history(pair_entity_id: str, limit: int = 200) -> list[dict]:
    """Get recent time_series_points for a pair (exchange_rate type), ordered newest first."""
    sb = _get_supabase()

    ft_resp = sb.table("fact_types").select("id").eq("key", "exchange_rate").single().execute()
    if not ft_resp.data:
        return []
    fact_type_id = ft_resp.data["id"]

    resp = (
        sb.table("time_series_points")
        .select("observed_at, data")
        .eq("entity_id", pair_entity_id)
        .eq("fact_type_id", fact_type_id)
        .order("observed_at", desc=True)
        .limit(limit)
        .execute()
    )

    return resp.data or []


@activity.defn
async def store_chat_message(
    user_id: str,
    conversation_id: str,
    role: str,
    content: str,
    model: str | None = None,
    tokens_used: int | None = None,
) -> str:
    """Store a chat message in the chat_messages table. Returns message ID."""
    sb = _get_supabase()
    msg_id = str(uuid.uuid4())
    row = {
        "id": msg_id,
        "user_id": user_id,
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "model": model or "",
        "tokens_used": tokens_used or 0,
    }
    sb.table("chat_messages").insert(row).execute()
    logger.info("store_chat_message_complete conversation=%s role=%s", conversation_id, role)
    return msg_id


@activity.defn
async def get_conversation_history(conversation_id: str, limit: int = 20) -> list[dict]:
    """Get recent messages for a conversation, oldest first."""
    sb = _get_supabase()
    resp = (
        sb.table("chat_messages")
        .select("role, content, model, tokens_used, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    return resp.data or []


@activity.defn
async def get_user_profile(user_id: str) -> dict:
    """Get the current entity_version data for a user_profile entity."""
    sb = _get_supabase()
    entity_resp = (
        sb.table("entities")
        .select("id")
        .eq("entity_type", "user_profile")
        .eq("source_record_id", user_id)
        .single()
        .execute()
    )
    if not entity_resp.data:
        return {}

    version_resp = (
        sb.table("entity_versions")
        .select("data")
        .eq("entity_id", entity_resp.data["id"])
        .eq("is_current", True)
        .single()
        .execute()
    )
    return version_resp.data.get("data", {}) if version_resp.data else {}


@activity.defn
async def trigger_alert_notification(alert_entity_id: str, pair: str, message: str) -> bool:
    """Insert a notification record for a triggered alert."""
    sb = _get_supabase()
    sb.table("notifications").insert({
        "alert_entity_id": alert_entity_id,
        "pair": pair,
        "message": message,
        "read": False,
    }).execute()
    logger.info("alert_notification_sent alert=%s pair=%s", alert_entity_id, pair)
    return True
