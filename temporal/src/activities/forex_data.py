from __future__ import annotations
import logging
from datetime import datetime, timezone

import httpx
import yfinance as yf
from temporalio import activity

from ..config import settings

logger = logging.getLogger(__name__)

MAJOR_PAIRS = [
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
]
MINOR_PAIRS = [
    "EURGBP", "EURJPY", "GBPJPY", "EURCHF", "EURAUD", "EURCAD", "EURNZD",
    "GBPCHF", "GBPAUD", "GBPCAD", "GBPNZD", "AUDJPY", "AUDNZD", "AUDCAD",
    "AUDCHF", "NZDJPY", "NZDCAD", "NZDCHF", "CADJPY", "CADCHF", "CHFJPY",
]
ALL_PAIRS = MAJOR_PAIRS + MINOR_PAIRS


def _pair_to_yfinance_ticker(pair: str) -> str:
    return f"{pair[:3]}{pair[3:]}=X"


@activity.defn
async def fetch_prices_yfinance(pairs: list[str] | None = None) -> list[dict]:
    """Fetch latest prices for all pairs via yfinance. Primary price source."""
    target_pairs = pairs or ALL_PAIRS
    tickers = [_pair_to_yfinance_ticker(p) for p in target_pairs]
    results: list[dict] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        data = yf.download(tickers, period="1d", interval="1d", progress=False, group_by="ticker")

        for pair, ticker in zip(target_pairs, tickers):
            try:
                if len(tickers) == 1:
                    row = data
                else:
                    row = data[ticker] if ticker in data.columns.get_level_values(0) else None

                if row is None or row.empty:
                    continue

                last = row.iloc[-1]
                high = float(last.get("High", 0))
                low = float(last.get("Low", 0))
                close = float(last.get("Close", 0))
                bid = low if low > 0 else close
                ask = high if high > 0 else close
                mid = close if close > 0 else (bid + ask) / 2

                results.append({
                    "pair": pair,
                    "bid": round(bid, 6),
                    "ask": round(ask, 6),
                    "mid": round(mid, 6),
                    "timestamp": now_iso,
                    "source": "yfinance",
                })
            except Exception as exc:
                logger.warning("yfinance_pair_failed pair=%s error=%s", pair, str(exc))

    except Exception as exc:
        logger.error("yfinance_batch_failed error=%s", str(exc))

    logger.info("yfinance_fetch_complete pairs_fetched=%d", len(results))
    return results


@activity.defn
async def fetch_prices_alpha_vantage(pair: str) -> dict:
    """Fetch real-time exchange rate for a single pair from Alpha Vantage. Limited to 25 req/day."""
    api_key = settings.alpha_vantage_api_key
    if not api_key:
        logger.warning("alpha_vantage_skipped reason=no_api_key")
        return {}

    from_currency = pair[:3]
    to_currency = pair[3:]
    url = "https://www.alphavantage.co/query"
    params = {
        "function": "CURRENCY_EXCHANGE_RATE",
        "from_currency": from_currency,
        "to_currency": to_currency,
        "apikey": api_key,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    rate_data = data.get("Realtime Currency Exchange Rate", {})
    if not rate_data:
        logger.warning("alpha_vantage_empty pair=%s", pair)
        return {}

    bid = float(rate_data.get("8. Bid Price", 0))
    ask = float(rate_data.get("9. Ask Price", 0))
    mid = float(rate_data.get("5. Exchange Rate", 0))

    logger.info("alpha_vantage_fetch_complete pair=%s mid=%f", pair, mid)
    return {
        "pair": pair,
        "bid": round(bid, 6),
        "ask": round(ask, 6),
        "mid": round(mid, 6),
        "timestamp": rate_data.get("6. Last Refreshed", datetime.now(timezone.utc).isoformat()),
        "source": "alpha_vantage",
    }


@activity.defn
async def fetch_ecb_rates() -> list[dict]:
    """Fetch daily EUR reference rates from Frankfurter (ECB mirror). Unlimited, no key."""
    url = "https://api.frankfurter.app/latest"
    results: list[dict] = []

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    base = data.get("base", "EUR")
    date_str = data.get("date", datetime.now(timezone.utc).date().isoformat())
    rates = data.get("rates", {})

    for currency, rate in rates.items():
        pair = f"{base}{currency}"
        results.append({
            "pair": pair,
            "bid": round(float(rate), 6),
            "ask": round(float(rate), 6),
            "mid": round(float(rate), 6),
            "timestamp": f"{date_str}T16:00:00+00:00",
            "source": "ecb",
        })

    logger.info("ecb_fetch_complete pairs_fetched=%d", len(results))
    return results


@activity.defn
async def fetch_fred_indicators(series_ids: list[str] | None = None) -> list[dict]:
    """Fetch economic indicators from FRED API."""
    api_key = settings.fred_api_key
    if not api_key:
        logger.warning("fred_skipped reason=no_api_key")
        return []

    target_series = series_ids or ["DFF", "CPIAUCSL", "GDP", "UNRATE", "T10Y2Y"]
    results: list[dict] = []

    async with httpx.AsyncClient(timeout=30) as client:
        for series_id in target_series:
            try:
                url = "https://api.stlouisfed.org/fred/series/observations"
                params = {
                    "series_id": series_id,
                    "api_key": api_key,
                    "file_type": "json",
                    "sort_order": "desc",
                    "limit": 1,
                }
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()

                observations = data.get("observations", [])
                if observations:
                    obs = observations[0]
                    value_str = obs.get("value", ".")
                    if value_str != ".":
                        results.append({
                            "indicator": series_id,
                            "value": float(value_str),
                            "date": obs.get("date", ""),
                            "source": "fred",
                        })
            except Exception as exc:
                logger.warning("fred_series_failed series=%s error=%s", series_id, str(exc))

    logger.info("fred_fetch_complete indicators_fetched=%d", len(results))
    return results


@activity.defn
async def fetch_news_headlines(query: str = "forex OR currency exchange") -> list[dict]:
    """Fetch forex news headlines from News API. 100 req/day on free tier."""
    api_key = settings.news_api_key
    if not api_key:
        logger.warning("newsapi_skipped reason=no_api_key")
        return []

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 20,
        "apiKey": api_key,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    articles = data.get("articles", [])
    results = [
        {
            "headline": a.get("title", ""),
            "source": a.get("source", {}).get("name", ""),
            "url": a.get("url", ""),
            "published_at": a.get("publishedAt", ""),
        }
        for a in articles
        if a.get("title")
    ]

    logger.info("newsapi_fetch_complete articles=%d", len(results))
    return results
