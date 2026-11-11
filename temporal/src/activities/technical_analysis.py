from __future__ import annotations
import logging

import pandas as pd
import ta
from temporalio import activity

logger = logging.getLogger(__name__)


@activity.defn
async def compute_technical_indicators(pair_entity_id: str, price_history: list[dict]) -> dict:
    """Compute RSI-14, MACD(12,26,9), SMA-50, SMA-200 from price history using the ta library."""
    if len(price_history) < 15:
        logger.warning("insufficient_price_history entity=%s count=%d", pair_entity_id, len(price_history))
        return {
            "pair_entity_id": pair_entity_id,
            "rsi_14": None,
            "macd_signal": None,
            "sma_50": None,
            "sma_200": None,
        }

    rows = []
    for point in reversed(price_history):
        data = point.get("data", {})
        mid = data.get("mid")
        if mid is not None:
            rows.append({"close": float(mid), "observed_at": point.get("observed_at", "")})

    if len(rows) < 15:
        return {
            "pair_entity_id": pair_entity_id,
            "rsi_14": None,
            "macd_signal": None,
            "sma_50": None,
            "sma_200": None,
        }

    df = pd.DataFrame(rows)

    rsi_14 = None
    if len(df) >= 15:
        rsi_series = ta.momentum.RSIIndicator(close=df["close"], window=14).rsi()
        last_rsi = rsi_series.iloc[-1]
        rsi_14 = round(float(last_rsi), 2) if pd.notna(last_rsi) else None

    macd_signal = None
    if len(df) >= 27:
        macd_ind = ta.trend.MACD(close=df["close"], window_slow=26, window_fast=12, window_sign=9)
        last_hist = macd_ind.macd_diff().iloc[-1]
        macd_signal = round(float(last_hist), 6) if pd.notna(last_hist) else None

    sma_50 = None
    if len(df) >= 50:
        sma_50_series = ta.trend.SMAIndicator(close=df["close"], window=50).sma_indicator()
        last_sma50 = sma_50_series.iloc[-1]
        sma_50 = round(float(last_sma50), 6) if pd.notna(last_sma50) else None

    sma_200 = None
    if len(df) >= 200:
        sma_200_series = ta.trend.SMAIndicator(close=df["close"], window=200).sma_indicator()
        last_sma200 = sma_200_series.iloc[-1]
        sma_200 = round(float(last_sma200), 6) if pd.notna(last_sma200) else None

    logger.info(
        "technical_indicators_computed entity=%s rsi=%s macd=%s sma50=%s sma200=%s",
        pair_entity_id, rsi_14, macd_signal, sma_50, sma_200,
    )
    return {
        "pair_entity_id": pair_entity_id,
        "rsi_14": rsi_14,
        "macd_signal": macd_signal,
        "sma_50": sma_50,
        "sma_200": sma_200,
    }
