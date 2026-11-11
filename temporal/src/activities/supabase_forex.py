from __future__ import annotations
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from temporalio import activity

from ..config import settings

logger = logging.getLogger(__name__)

HEADERS = {
    "apikey": settings.supabase_service_role_key,
    "Authorization": f"Bearer {settings.supabase_service_role_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
REST_URL = f"{settings.supabase_url}/rest/v1"


def _get(table: str, params: dict | None = None) -> list[dict]:
    url = f"{REST_URL}/{table}"
    resp = httpx.get(url, headers=HEADERS, params=params or {}, timeout=15)
    resp.raise_for_status()
    return resp.json()


def _post(table: str, data: dict, upsert: bool = False, on_conflict: str | None = None) -> list[dict]:
    url = f"{REST_URL}/{table}"
    hdrs = dict(HEADERS)
    params: dict[str, str] = {}
    if upsert:
        hdrs["Prefer"] = "resolution=merge-duplicates,return=representation"
        if on_conflict:
            params["on_conflict"] = on_conflict
    resp = httpx.post(url, headers=hdrs, json=data, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def _get_single(table: str, params: dict) -> dict | None:
    params["limit"] = "1"
    rows = _get(table, params)
    return rows[0] if rows else None


@activity.defn
async def upsert_price_data(prices: list[dict]) -> int:
    """Insert price ticks into time_series_points and upsert exchange_rate entity_facts."""
    inserted = 0

    ft = _get_single("fact_types", {"key": "eq.exchange_rate", "select": "id"})
    if not ft:
        logger.error("upsert_price_data_failed reason=exchange_rate_fact_type_not_found")
        return 0
    fact_type_id = ft["id"]

    for price in prices:
        pair = price.get("pair", "")
        entity = _get_single("entities", {"entity_type": "eq.currency_pair", "source_record_id": f"eq.{pair}", "select": "id"})
        if not entity:
            logger.warning("pair_entity_not_found pair=%s", pair)
            continue
        entity_id = entity["id"]

        ts_row = {
            "entity_id": entity_id,
            "fact_type_id": fact_type_id,
            "observed_at": price.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "data_payload": {"bid": price.get("bid"), "ask": price.get("ask"), "mid": price.get("mid"), "source": price.get("source", "")},
            "source_id": price.get("source", ""),
        }
        _post("time_series_points", ts_row)

        spread_pips = round(abs(price.get("ask", 0) - price.get("bid", 0)) * 10000, 2)
        fact_row = {
            "entity_id": entity_id,
            "fact_type_id": fact_type_id,
            "dimension_type": None,
            "dimension_id": None,
            "value": price.get("mid", 0),
            "source_id": price.get("source", ""),
            "metadata": {"bid": price.get("bid"), "ask": price.get("ask"), "spread_pips": spread_pips},
        }
        _post("entity_facts", fact_row, upsert=True, on_conflict="entity_id,fact_type_id,dimension_id")
        inserted += 1

    logger.info("upsert_price_data_complete inserted=%d", inserted)
    return inserted


@activity.defn
async def upsert_entity_fact(entity_id: str, fact_type_key: str, value: float, metadata: dict | None = None) -> str:
    """Upsert a single entity fact by fact_type key. Returns the fact row ID."""
    ft = _get_single("fact_types", {"key": f"eq.{fact_type_key}", "select": "id"})
    if not ft:
        logger.error("upsert_entity_fact_failed reason=fact_type_not_found key=%s", fact_type_key)
        return ""

    row = {"entity_id": entity_id, "fact_type_id": ft["id"], "dimension_type": None, "dimension_id": None, "value": value, "metadata": metadata or {}}
    resp = _post("entity_facts", row, upsert=True, on_conflict="entity_id,fact_type_id,dimension_id")
    fact_id = resp[0]["id"] if resp else ""
    logger.info("upsert_entity_fact_complete entity=%s fact_type=%s value=%f", entity_id, fact_type_key, value)
    return fact_id


@activity.defn
async def get_active_alerts() -> list[dict]:
    """Fetch all active alert entities with their latest version data."""
    alerts = _get("entities", {"entity_type": "eq.alert", "select": "id,source_record_id"})
    if not alerts:
        return []

    results: list[dict] = []
    for alert_entity in alerts:
        version = _get_single("entity_versions", {"entity_id": f"eq.{alert_entity['id']}", "is_current": "eq.true", "select": "data"})
        if not version:
            continue
        data = version.get("data", {})
        if not data.get("is_active", False):
            continue

        rel = _get_single("relationships_v2", {"parent_id": f"eq.{alert_entity['id']}", "relationship_type": "eq.alert_watches_pair", "is_current": "eq.true", "select": "child_id"})
        pair_entity_id = rel["child_id"] if rel else None

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
    rows = _get("entity_facts", {"entity_id": f"eq.{pair_entity_id}", "select": "value,metadata,fact_types(key,label,unit)"})
    facts: dict[str, Any] = {}
    for row in rows:
        ft = row.get("fact_types", {})
        key = ft.get("key", "")
        if key:
            facts[key] = {"value": row.get("value"), "unit": ft.get("unit", ""), "label": ft.get("label", ""), "metadata": row.get("metadata", {})}
    logger.info("get_pair_facts_complete entity=%s fact_count=%d", pair_entity_id, len(facts))
    return facts


@activity.defn
async def get_all_pair_entities() -> list[dict]:
    """Get all currency pair entities."""
    return _get("entities", {"entity_type": "eq.currency_pair", "select": "id,source_record_id"})


@activity.defn
async def get_price_history(pair_entity_id: str, limit: int = 200) -> list[dict]:
    """Get recent time_series_points for a pair (exchange_rate type), ordered newest first."""
    ft = _get_single("fact_types", {"key": "eq.exchange_rate", "select": "id"})
    if not ft:
        return []
    return _get("time_series_points", {
        "entity_id": f"eq.{pair_entity_id}",
        "fact_type_id": f"eq.{ft['id']}",
        "select": "observed_at,data_payload",
        "order": "observed_at.desc",
        "limit": str(limit),
    })


@activity.defn
async def store_chat_message(user_id: str, conversation_id: str, role: str, content: str, model: str | None = None, tokens_used: int | None = None) -> str:
    """Store a chat message in the chat_messages table. Returns message ID."""
    msg_id = str(uuid.uuid4())
    row = {"id": msg_id, "user_id": user_id, "conversation_id": conversation_id, "role": role, "content": content, "model": model or "", "tokens_used": tokens_used or 0}
    _post("chat_messages", row)
    logger.info("store_chat_message_complete conversation=%s role=%s", conversation_id, role)
    return msg_id


@activity.defn
async def get_conversation_history(conversation_id: str, limit: int = 20) -> list[dict]:
    """Get recent messages for a conversation, oldest first."""
    return _get("chat_messages", {"conversation_id": f"eq.{conversation_id}", "select": "role,content,model,tokens_used,created_at", "order": "created_at.asc", "limit": str(limit)})


@activity.defn
async def get_user_profile(user_id: str) -> dict:
    """Get the current entity_version data for a user_profile entity."""
    entity = _get_single("entities", {"entity_type": "eq.user_profile", "source_record_id": f"eq.{user_id}", "select": "id"})
    if not entity:
        return {}
    version = _get_single("entity_versions", {"entity_id": f"eq.{entity['id']}", "is_current": "eq.true", "select": "data"})
    return version.get("data", {}) if version else {}


@activity.defn
async def trigger_alert_notification(alert_entity_id: str, pair: str, message: str) -> bool:
    """Insert a notification record for a triggered alert."""
    _post("notifications", {"user_id": "00000000-0000-0000-0000-000000000000", "type": "alert_triggered", "title": f"Alert: {pair}", "body": message, "metadata": {"alert_entity_id": alert_entity_id, "pair": pair}})
    logger.info("alert_notification_sent alert=%s pair=%s", alert_entity_id, pair)
    return True
