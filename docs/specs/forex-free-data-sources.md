# Forex Agentic AI — Free Data Sources Reference

**Status:** Draft
**Created:** 2026-11-11
**Last Updated:** 2026-11-11

This document catalogues free data sources the Forex Agentic AI can consume, how they map to the template data model, and how Temporal workflows integrate them.

---

## Data Model Mapping Summary

| Data Source Category | Template Target | Entity Type | Fact Types (examples) |
|---|---|---|---|
| Exchange Rate APIs | `time_series_points` | `currency_pair` | `exchange_rate`, `bid_price`, `ask_price`, `ohlc_close` |
| Economic Indicators | `entity_facts` + `time_series_points` | `economy` | `interest_rate`, `cpi`, `gdp_growth`, `unemployment_rate` |
| News & Sentiment | `time_series_points` | `currency_pair` / `economy` | `sentiment_score`, `news_volume` |
| Technical Analysis | `entity_facts` (derived) | `currency_pair` | `rsi_14`, `macd_signal`, `bollinger_band_upper` |
| Calendar & Scheduling | `time_series_points` | `economy` | `calendar_event_impact` |

---

## 1. Exchange Rate APIs

These feed `time_series_points` for `currency_pair` entities.

### 1.1 Alpha Vantage

| Field | Detail |
|---|---|
| **URL** | https://www.alphavantage.co/ |
| **Data** | Forex intraday (1m–60m), daily, weekly, monthly OHLC; 180+ currency pairs |
| **Free Tier** | 25 requests/day, 5 requests/minute |
| **Auth** | API key (free registration) |
| **Format** | JSON, CSV |
| **Python Library** | `alpha_vantage` (`pip install alpha_vantage`) |
| **Data Delay** | Real-time on free tier |

**Data Model Mapping:**
- Entity: `currency_pair` (e.g. source_record_id = `EUR/USD`)
- Fact type: `exchange_rate_close`, `exchange_rate_open`, `exchange_rate_high`, `exchange_rate_low`
- Target: `time_series_points.data` → `{"open": 1.0854, "high": 1.0871, "low": 1.0842, "close": 1.0863, "volume": 0}`

**Sample Code:**
```python
from alpha_vantage.foreignexchange import ForeignExchange
import os

fx = ForeignExchange(key=os.environ["ALPHA_VANTAGE_KEY"], output_format="json")
data, meta = fx.get_currency_exchange_daily(
    from_symbol="EUR", to_symbol="USD"
)
# data is dict keyed by date string with OHLC values
```

**Temporal Integration:**
- Workflow: `FetchExchangeRatesWorkflow` (scheduled daily)
- Activity: `fetch_alpha_vantage_daily` → inserts into `time_series_points`
- Activity: `derive_exchange_rate_facts` → upserts latest rate into `entity_facts`

---

### 1.2 ECB Statistical Data Warehouse (SDMX)

| Field | Detail |
|---|---|
| **URL** | https://data.ecb.europa.eu/ |
| **Data** | EUR reference rates against ~40 currencies, daily publication at 16:00 CET |
| **Free Tier** | Unlimited (public institutional data) |
| **Auth** | None |
| **Format** | XML (SDMX), JSON, CSV |
| **Python Library** | `sdmx1` (`pip install sdmx1`) or direct HTTP |
| **Data Delay** | End-of-day (published ~16:00 CET) |

**Data Model Mapping:**
- Entity: `currency_pair` (EUR base)
- Fact type: `ecb_reference_rate`
- Target: `time_series_points.data` → `{"value": 1.0863, "source": "ecb", "unit": "EUR"}`

**Sample Code:**
```python
import requests

# Daily EUR/USD reference rate
url = "https://data.ecb.europa.eu/data-detail-api/EXR.D.USD.EUR.SP00.A"
resp = requests.get(url, headers={"Accept": "application/json"})
data = resp.json()
```

**Temporal Integration:**
- Workflow: `FetchECBRatesWorkflow` (scheduled daily at 16:30 CET)
- Activity: `fetch_ecb_reference_rates` → bulk insert into `time_series_points`
- No API key management needed — simplest source to set up first

---

### 1.3 Open Exchange Rates

| Field | Detail |
|---|---|
| **URL** | https://openexchangerates.org/ |
| **Data** | Latest and historical exchange rates, 170+ currencies |
| **Free Tier** | 1,000 requests/month; USD base only; hourly updates |
| **Auth** | API key (free registration) |
| **Format** | JSON |
| **Python Library** | `openexchangerates` or direct HTTP |
| **Data Delay** | Hourly on free tier |

**Data Model Mapping:**
- Entity: `currency_pair` (USD base)
- Fact type: `exchange_rate`
- Target: `time_series_points.data` → `{"value": 1.0863, "base": "USD", "timestamp": 1699700400}`

**Sample Code:**
```python
import requests, os

url = f"https://openexchangerates.org/api/latest.json?app_id={os.environ['OXR_APP_ID']}"
resp = requests.get(url)
rates = resp.json()["rates"]  # {"EUR": 0.921, "GBP": 0.794, ...}
```

**Temporal Integration:**
- Workflow: `FetchOpenExchangeRatesWorkflow` (scheduled hourly)
- Activity: `fetch_oxr_latest` → batch insert all pairs into `time_series_points`

---

### 1.4 ExchangeRate-API

| Field | Detail |
|---|---|
| **URL** | https://www.exchangerate-api.com/ |
| **Data** | Latest and historical rates, 160+ currencies |
| **Free Tier** | 1,500 requests/month; daily updates |
| **Auth** | API key (free registration) |
| **Format** | JSON |
| **Python Library** | Direct HTTP |
| **Data Delay** | Daily on free tier |

**Sample Code:**
```python
import requests, os

url = f"https://v6.exchangerate-api.com/v6/{os.environ['EXRATE_KEY']}/latest/USD"
resp = requests.get(url)
rates = resp.json()["conversion_rates"]
```

---

### 1.5 Fixer.io

| Field | Detail |
|---|---|
| **URL** | https://fixer.io/ |
| **Data** | Latest and historical rates, 170+ currencies |
| **Free Tier** | 100 requests/month; EUR base only; no HTTPS on free |
| **Auth** | API key (free registration) |
| **Format** | JSON |
| **Python Library** | `fixerio` (`pip install fixerio`) |
| **Data Delay** | Hourly |

**Sample Code:**
```python
import requests, os

url = f"http://data.fixer.io/api/latest?access_key={os.environ['FIXER_KEY']}"
resp = requests.get(url)
rates = resp.json()["rates"]  # EUR base
```

---

### 1.6 OANDA (Demo Account)

| Field | Detail |
|---|---|
| **URL** | https://developer.oanda.com/ |
| **Data** | Streaming forex prices, candlestick data, order book; 70+ pairs |
| **Free Tier** | Demo/practice account (free registration); unlimited requests |
| **Auth** | Bearer token (demo account API key) |
| **Format** | JSON (REST), streaming JSON lines |
| **Python Library** | `oandapyV20` (`pip install oandapyV20`) |
| **Data Delay** | Real-time streaming |

**Data Model Mapping:**
- Entity: `currency_pair`
- Fact types: `bid_price`, `ask_price`, `spread`
- Target: `time_series_points.data` → `{"bid": 1.0860, "ask": 1.0863, "spread": 0.0003}`

**Sample Code:**
```python
from oandapyV20 import API
from oandapyV20.endpoints.pricing import PricingStream
import os

api = API(access_token=os.environ["OANDA_TOKEN"], environment="practice")
params = {"instruments": "EUR_USD,GBP_USD"}
r = PricingStream(accountID=os.environ["OANDA_ACCOUNT"], params=params)
for tick in api.request(r):
    if tick["type"] == "PRICE":
        print(tick["instrument"], tick["bids"][0]["price"], tick["asks"][0]["price"])
```

**Temporal Integration:**
- Workflow: `StreamOandaPricesWorkflow` (long-running)
- Activity: `stream_oanda_prices` → continuous insert into `time_series_points`
- Best source for near-real-time price data on free tier

---

### 1.7 Yahoo Finance (via yfinance)

| Field | Detail |
|---|---|
| **URL** | https://finance.yahoo.com/ |
| **Data** | Historical forex OHLCV, up to 30 years of daily data |
| **Free Tier** | Unlimited (unofficial API, no key); rate-limit by IP |
| **Auth** | None |
| **Format** | Pandas DataFrame (via library) |
| **Python Library** | `yfinance` (`pip install yfinance`) |
| **Data Delay** | ~15 minutes for intraday; end-of-day for daily |

**Data Model Mapping:**
- Entity: `currency_pair`
- Fact types: `exchange_rate_close`, `exchange_rate_open`, `exchange_rate_high`, `exchange_rate_low`
- Target: `time_series_points.data` → `{"open": ..., "high": ..., "low": ..., "close": ..., "volume": ...}`

**Sample Code:**
```python
import yfinance as yf

eurusd = yf.Ticker("EURUSD=X")
hist = eurusd.history(period="1mo", interval="1d")
# DataFrame with Open, High, Low, Close, Volume columns
```

**Temporal Integration:**
- Workflow: `BackfillHistoricalRatesWorkflow` (one-time or weekly)
- Activity: `fetch_yfinance_history` → bulk insert historical data into `time_series_points`
- Primary source for historical backfill (no API key, broad coverage)

---

## 2. Economic Indicators

These feed `entity_facts` (current KPIs) and `time_series_points` (historical data) for `economy` entities.

### 2.1 Federal Reserve FRED API

| Field | Detail |
|---|---|
| **URL** | https://fred.stlouisfed.org/docs/api/ |
| **Data** | 800,000+ time series: interest rates, CPI, GDP, unemployment, inflation, trade balances, Fed Funds rate |
| **Free Tier** | 120 requests/minute; unlimited daily |
| **Auth** | API key (free registration) |
| **Format** | JSON, XML |
| **Python Library** | `fredapi` (`pip install fredapi`) |
| **Data Delay** | Varies by series (some same-day, some monthly lag) |

**Key Series for Forex:**

| Series ID | Description | Frequency | Forex Impact |
|---|---|---|---|
| `DFF` | Federal Funds Effective Rate | Daily | Direct USD impact |
| `CPIAUCSL` | CPI All Urban Consumers | Monthly | Inflation → rate expectations |
| `GDP` | Gross Domestic Product | Quarterly | USD strength indicator |
| `UNRATE` | Unemployment Rate | Monthly | Labor market → rate decisions |
| `DTWEXBGS` | Trade Weighted USD Index (Broad) | Daily | USD relative strength |
| `T10Y2Y` | 10Y-2Y Treasury Spread | Daily | Recession indicator |

**Data Model Mapping:**
- Entity: `economy` (e.g. source_record_id = `US`)
- Fact types: `interest_rate`, `cpi_yoy`, `gdp_growth_rate`, `unemployment_rate`
- `entity_facts.value` → latest numeric value
- `time_series_points.data` → `{"value": 5.33, "series_id": "DFF", "unit": "percent"}`

**Sample Code:**
```python
from fredapi import Fred
import os

fred = Fred(api_key=os.environ["FRED_API_KEY"])
fed_funds = fred.get_series("DFF")          # Pandas Series
cpi = fred.get_series("CPIAUCSL")
gdp = fred.get_series("GDP")
```

**Temporal Integration:**
- Workflow: `FetchEconomicIndicatorsWorkflow` (scheduled daily)
- Activity: `fetch_fred_series` (parameterised by series IDs) → inserts into `time_series_points`
- Activity: `derive_economic_facts` → upserts latest values into `entity_facts`
- Most critical data source for fundamental analysis agent

---

### 2.2 World Bank Open Data

| Field | Detail |
|---|---|
| **URL** | https://data.worldbank.org/ |
| **Data** | GDP, trade balances, FDI, current account, PPP, global macro data for 200+ countries |
| **Free Tier** | Unlimited (public data) |
| **Auth** | None |
| **Format** | JSON, XML, CSV |
| **Python Library** | `wbgapi` (`pip install wbgapi`) or `world_bank_data` |
| **Data Delay** | Annual/quarterly data; months to years of lag |

**Key Indicators for Forex:**

| Indicator Code | Description |
|---|---|
| `NY.GDP.MKTP.CD` | GDP (current USD) |
| `BN.CAB.XOKA.CD` | Current Account Balance |
| `FP.CPI.TOTL.ZG` | CPI Inflation (annual %) |
| `FR.INR.RINR` | Real Interest Rate |
| `NE.TRD.GNFS.ZS` | Trade (% of GDP) |

**Sample Code:**
```python
import wbgapi as wb

# GDP for USA, EU, Japan, UK — last 5 years
gdp = wb.data.DataFrame("NY.GDP.MKTP.CD", economy=["USA", "EMU", "JPN", "GBR"], time=range(2021, 2026))
```

**Temporal Integration:**
- Workflow: `FetchWorldBankDataWorkflow` (scheduled weekly)
- Activity: `fetch_world_bank_indicators` → inserts into `time_series_points`
- Used for long-term macro analysis and country comparisons

---

### 2.3 IMF Data API

| Field | Detail |
|---|---|
| **URL** | https://datahelp.imf.org/knowledgebase/articles/667681-using-json-restful-web-service |
| **Data** | Balance of payments, international financial statistics, exchange rate arrangements, direction of trade |
| **Free Tier** | Unlimited (public data) |
| **Auth** | None |
| **Format** | JSON, SDMX |
| **Python Library** | Direct HTTP or `imfp` |
| **Data Delay** | Quarterly/annual; several months lag |

**Sample Code:**
```python
import requests

# IFS — International Financial Statistics for USA
url = "http://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData/IFS/Q.US.ENDA_XDC_USD_RATE"
resp = requests.get(url)
data = resp.json()
```

**Temporal Integration:**
- Workflow: `FetchIMFDataWorkflow` (scheduled monthly)
- Activity: `fetch_imf_indicators` → inserts into `time_series_points`

---

### 2.4 Economic Calendar (Investing.com / ForexFactory)

| Field | Detail |
|---|---|
| **URL** | https://www.investing.com/economic-calendar/ |
| **Data** | Scheduled macro events: NFP, rate decisions, GDP releases, CPI prints, PMI |
| **Free Tier** | Free (web scraping or RSS; no official API) |
| **Auth** | None |
| **Format** | HTML (scraping), iCal |
| **Python Library** | `investpy` (deprecated but functional), `beautifulsoup4` for scraping |
| **Data Delay** | Real-time event schedule |

**Data Model Mapping:**
- Entity: `economy`
- Fact type: `calendar_event_impact`
- Target: `time_series_points.data` → `{"event": "Non-Farm Payrolls", "impact": "high", "forecast": 180000, "previous": 175000, "actual": null, "scheduled_at": "2026-11-06T13:30:00Z"}`
- `dim_event_impact` dimension table: `low`, `medium`, `high`

**Temporal Integration:**
- Workflow: `FetchEconomicCalendarWorkflow` (scheduled daily at 00:00 UTC)
- Activity: `scrape_economic_calendar` → inserts upcoming events into `time_series_points`
- Activity: `update_calendar_actuals` (runs after each event) → updates with actual values

---

## 3. News & Sentiment

These feed `time_series_points` for sentiment analysis by the Claude Bedrock agent.

### 3.1 News API (newsapi.org)

| Field | Detail |
|---|---|
| **URL** | https://newsapi.org/ |
| **Data** | Headlines and full articles from 150,000+ sources; financial and forex news |
| **Free Tier** | 100 requests/day (Developer plan); articles up to 1 month old |
| **Auth** | API key (free registration) |
| **Format** | JSON |
| **Python Library** | `newsapi-python` (`pip install newsapi-python`) |
| **Data Delay** | Near real-time |

**Data Model Mapping:**
- Entity: `currency_pair` or `economy` (tagged by relevance)
- Fact type: `news_sentiment_score`, `news_volume`
- Target: `time_series_points.data` → `{"title": "...", "source": "Reuters", "url": "...", "sentiment": null}`
- Sentiment is derived by Claude Bedrock in a downstream activity

**Sample Code:**
```python
from newsapi import NewsApiClient
import os

newsapi = NewsApiClient(api_key=os.environ["NEWS_API_KEY"])
headlines = newsapi.get_everything(
    q="forex OR currency OR \"exchange rate\" OR \"interest rate\"",
    language="en",
    sort_by="publishedAt",
    page_size=50
)
```

**Temporal Integration:**
- Workflow: `FetchForexNewsWorkflow` (scheduled every 6 hours)
- Activity: `fetch_news_articles` → inserts raw articles into `time_series_points`
- Activity: `analyze_sentiment_bedrock` → calls Claude on Bedrock to score sentiment → upserts `sentiment_score` into `entity_facts`

---

### 3.2 Reddit API (via PRAW)

| Field | Detail |
|---|---|
| **URL** | https://www.reddit.com/dev/api/ |
| **Data** | Posts and comments from r/forex, r/trading, r/wallstreetbets, r/investing |
| **Free Tier** | 100 requests/minute (OAuth, free app registration) |
| **Auth** | OAuth2 (app registration, client ID + secret) |
| **Format** | JSON |
| **Python Library** | `praw` (`pip install praw`) |
| **Data Delay** | Real-time |

**Data Model Mapping:**
- Entity: `currency_pair` (matched by mention)
- Fact type: `reddit_sentiment_score`, `reddit_mention_volume`
- Target: `time_series_points.data` → `{"subreddit": "forex", "title": "...", "body": "...", "score": 42, "num_comments": 15, "sentiment": null}`

**Sample Code:**
```python
import praw, os

reddit = praw.Reddit(
    client_id=os.environ["REDDIT_CLIENT_ID"],
    client_secret=os.environ["REDDIT_CLIENT_SECRET"],
    user_agent="ForexAgentAI/1.0"
)
for post in reddit.subreddit("forex").hot(limit=25):
    print(post.title, post.score)
```

**Temporal Integration:**
- Workflow: `FetchRedditSentimentWorkflow` (scheduled every 4 hours)
- Activity: `fetch_reddit_posts` → inserts into `time_series_points`
- Activity: `analyze_sentiment_bedrock` (shared with news) → derives sentiment facts

---

### 3.3 Twitter/X API (Free Tier)

| Field | Detail |
|---|---|
| **URL** | https://developer.x.com/ |
| **Data** | Tweets from financial influencers, central bank accounts, forex analysts |
| **Free Tier** | Write-only on free; Basic ($100/month) for 10,000 reads/month |
| **Auth** | OAuth 2.0 (app registration) |
| **Format** | JSON |
| **Python Library** | `tweepy` (`pip install tweepy`) |
| **Data Delay** | Real-time |

**Note:** The free tier is effectively unusable for reading tweets as of 2024. The Basic tier ($100/month) or scraping alternatives may be necessary. Consider this a lower-priority source.

---

### 3.4 GDELT Project

| Field | Detail |
|---|---|
| **URL** | https://www.gdeltproject.org/ |
| **Data** | Global news events, sentiment, themes, locations; updated every 15 minutes; billions of records |
| **Free Tier** | Unlimited (public data via BigQuery or direct download) |
| **Auth** | None (direct), Google Cloud account (BigQuery) |
| **Format** | CSV (bulk), JSON (API), BigQuery |
| **Python Library** | `gdeltdoc` (`pip install gdeltdoc`) |
| **Data Delay** | 15-minute update cycle |

**Data Model Mapping:**
- Entity: `economy` or `currency_pair`
- Fact type: `gdelt_tone_score`, `gdelt_event_count`
- Target: `time_series_points.data` → `{"avg_tone": -2.3, "num_articles": 150, "themes": ["ECON_INTEREST_RATE", "CURRENCY"]}`

**Sample Code:**
```python
from gdeltdoc import GdeltDoc, Filters

gd = GdeltDoc()
f = Filters(
    keyword="forex currency exchange rate",
    start_date="2026-11-10",
    end_date="2026-11-11",
    country="US"
)
articles = gd.article_search(f)  # DataFrame
```

**Temporal Integration:**
- Workflow: `FetchGDELTSentimentWorkflow` (scheduled every 30 minutes)
- Activity: `fetch_gdelt_articles` → inserts into `time_series_points`
- Best for volume-based sentiment analysis at global scale

---

### 3.5 Financial Modeling Prep (FMP)

| Field | Detail |
|---|---|
| **URL** | https://financialmodelingprep.com/ |
| **Data** | Forex quotes, financial news, economic indicators, earnings calendars |
| **Free Tier** | 250 requests/day; limited historical depth |
| **Auth** | API key (free registration) |
| **Format** | JSON |
| **Python Library** | Direct HTTP |
| **Data Delay** | Near real-time |

**Sample Code:**
```python
import requests, os

url = f"https://financialmodelingprep.com/api/v3/fx?apikey={os.environ['FMP_KEY']}"
resp = requests.get(url)
forex_quotes = resp.json()  # [{"ticker": "EUR/USD", "bid": "1.0860", "ask": "1.0863", ...}]
```

---

## 4. Technical Analysis Libraries

These run locally to derive indicators from price data already in `time_series_points`, then upsert computed values into `entity_facts`.

### 4.1 `ta` (Technical Analysis Library)

| Field | Detail |
|---|---|
| **URL** | https://github.com/bukosabino/ta |
| **Install** | `pip install ta` |
| **Capabilities** | RSI, MACD, Bollinger Bands, Stochastic, ADX, CCI, ATR, OBV, and 40+ indicators |
| **Input** | Pandas DataFrame with OHLCV columns |

**Sample Code:**
```python
import ta
import pandas as pd

# df = DataFrame with 'close', 'high', 'low', 'volume' columns from time_series_points
df["rsi_14"] = ta.momentum.RSIIndicator(close=df["close"], window=14).rsi()
df["macd"] = ta.trend.MACD(close=df["close"]).macd()
df["bb_upper"] = ta.volatility.BollingerBands(close=df["close"]).bollinger_hband()
```

---

### 4.2 `pandas-ta` (Comprehensive TA)

| Field | Detail |
|---|---|
| **URL** | https://github.com/twopirllc/pandas-ta |
| **Install** | `pip install pandas-ta` |
| **Capabilities** | 130+ indicators; built-in strategy runner; works as DataFrame extension |

**Sample Code:**
```python
import pandas_ta as ta

# df.ta accessor adds all indicators
df.ta.rsi(length=14, append=True)
df.ta.macd(append=True)
df.ta.bbands(append=True)
df.ta.strategy("all")  # compute all available indicators
```

---

### 4.3 TradingView Widgets (Frontend)

| Field | Detail |
|---|---|
| **URL** | https://www.tradingview.com/widget/ |
| **Data** | Interactive charts, technical analysis overlays, real-time prices |
| **Free Tier** | Free embeddable widgets (client-side, no API key) |
| **Format** | JavaScript embed / iframe |
| **Integration** | React component wrapping TradingView widget script |

**Data Model Mapping:**
- No backend integration — purely frontend visualization
- Complements the React + Vite frontend in the template stack

**Sample React Component:**
```tsx
import { useEffect, useRef } from "react";

function TradingViewChart({ symbol = "FX:EURUSD" }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      new (window as any).TradingView.widget({
        container_id: containerRef.current!.id,
        symbol,
        interval: "D",
        theme: "dark",
        style: "1",
        locale: "en",
        width: "100%",
        height: 500,
      });
    };
    document.head.appendChild(script);
  }, [symbol]);

  return <div id="tv-chart" ref={containerRef} />;
}
```

---

## 5. Calendar & Scheduling Data

### 5.1 Forex Factory Calendar

| Field | Detail |
|---|---|
| **URL** | https://www.forexfactory.com/calendar |
| **Data** | Most widely used forex economic calendar; NFP, CPI, rate decisions, PMI, GDP |
| **Free Tier** | Free (web scraping; no official API) |
| **Auth** | None |
| **Format** | HTML (scraping) |
| **Python Library** | `beautifulsoup4` + `requests` for scraping |
| **Data Delay** | Real-time event schedule |

**Sample Code:**
```python
import requests
from bs4 import BeautifulSoup

url = "https://www.forexfactory.com/calendar?week=this"
headers = {"User-Agent": "ForexAgentAI/1.0"}
resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.text, "html.parser")
# Parse calendar rows from the table
```

---

### 5.2 DailyFX Economic Calendar

| Field | Detail |
|---|---|
| **URL** | https://www.dailyfx.com/economic-calendar |
| **Data** | Economic events with impact ratings, forecasts, and actuals |
| **Free Tier** | Free (web scraping; partial API via embedded JSON) |
| **Auth** | None |
| **Format** | HTML / embedded JSON |
| **Data Delay** | Real-time |

---

### 5.3 Myfxbook Community Data

| Field | Detail |
|---|---|
| **URL** | https://www.myfxbook.com/api |
| **Data** | Community sentiment (% long/short), economic calendar, trade statistics |
| **Free Tier** | Free API with registration |
| **Auth** | Session-based (email + password login) |
| **Format** | JSON |
| **Python Library** | Direct HTTP |

**Data Model Mapping:**
- Entity: `currency_pair`
- Fact type: `community_long_pct`, `community_short_pct`
- Target: `entity_facts.value` → e.g. `62.5` (% long)

**Sample Code:**
```python
import requests

# Login
login = requests.get("https://www.myfxbook.com/api/login.json", params={
    "email": "user@example.com", "password": "..."
})
session = login.json()["session"]

# Community outlook
outlook = requests.get("https://www.myfxbook.com/api/get-community-outlook.json", params={
    "session": session
})
data = outlook.json()["symbols"]  # [{"name": "EURUSD", "shortPercentage": 38, "longPercentage": 62}]
```

---

## 6. Recommended Priority Order for Implementation

| Phase | Sources | Rationale |
|---|---|---|
| **Phase 1** | yfinance, ECB, FRED, `ta`/`pandas-ta` | No API keys needed (yfinance/ECB) or generous limits (FRED). Covers historical rates, macro data, and technical indicators |
| **Phase 2** | Alpha Vantage, News API, OANDA demo | Real-time rates and news. Adds sentiment analysis via Claude Bedrock |
| **Phase 3** | Reddit (PRAW), GDELT, Open Exchange Rates, Forex Factory | Community sentiment, global news events, broader rate coverage, economic calendar |
| **Phase 4** | World Bank, IMF, FMP, Myfxbook, TradingView widgets | Long-term macro data, community data, and interactive charting in the frontend |

---

## 7. Environment Variables Required

```bash
# Phase 1
FRED_API_KEY=your_fred_key

# Phase 2
ALPHA_VANTAGE_KEY=your_av_key
NEWS_API_KEY=your_newsapi_key
OANDA_TOKEN=your_oanda_demo_token
OANDA_ACCOUNT=your_oanda_account_id

# Phase 3
REDDIT_CLIENT_ID=your_reddit_app_id
REDDIT_CLIENT_SECRET=your_reddit_secret
OXR_APP_ID=your_open_exchange_rates_key

# Phase 4
FMP_KEY=your_fmp_key
FIXER_KEY=your_fixer_key
```

---

## 8. Python Dependencies (Temporal Worker)

Add these to `temporal/pyproject.toml`:

```toml
[project]
dependencies = [
  # ... existing deps ...
  # Phase 1
  "yfinance>=0.2.30",
  "fredapi>=0.5.0",
  "sdmx1>=2.10.0",
  "ta>=0.11.0",
  "pandas-ta>=0.3.14b",
  "pandas>=2.0",
  # Phase 2
  "alpha_vantage>=2.3.1",
  "newsapi-python>=0.2.7",
  "oandapyV20>=0.7.2",
  # Phase 3
  "praw>=7.7.0",
  "gdeltdoc>=1.4",
  "beautifulsoup4>=4.12",
  # AWS (Claude Bedrock)
  "boto3>=1.28",
]
```

---

## 9. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL DATA SOURCES                       │
├──────────┬──────────┬───────────┬───────────┬──────────────────┤
│ Rate APIs│ FRED/WB  │ News APIs │ Reddit/X  │ Calendars        │
│ (1.1-1.7)│ (2.1-2.3)│ (3.1-3.5) │ (3.2-3.3) │ (5.1-5.3)       │
└────┬─────┴────┬─────┴─────┬─────┴─────┬─────┴────────┬─────────┘
     │          │           │           │              │
     ▼          ▼           ▼           ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│              TEMPORAL WORKFLOWS (Scheduled)                      │
│  FetchRates │ FetchEcon │ FetchNews │ FetchSentiment│ FetchCal  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                         │
│                                                                 │
│  time_series_points ──► Temporal Activities ──► entity_facts    │
│  (raw event store)      (derive + analyze)     (current KPIs)   │
│                              │                                  │
│                              ▼                                  │
│                    Claude Bedrock (sentiment,                    │
│                    recommendations, analysis)                    │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              REACT FRONTEND (Vite + TanStack)                   │
│  Dashboard │ Pair Analysis │ Chat │ TradingView │ Alerts        │
└─────────────────────────────────────────────────────────────────┘
```
