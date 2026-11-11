# Forex Agentic AI Personal Assistant — Specification

**Status:** Draft
**Owner:** Brendon Muchesa / AI Accelerator Team
**Created:** 2026-11-11
**Last Updated:** 2026-11-11

## Overview

A conversational Agentic AI that serves as a personal forex trading assistant. The system targets two audiences: experienced traders who need AI-powered market analysis, alerts, and paper-trading portfolio analytics; and complete beginners who want to learn forex fundamentals and receive guided currency pair recommendations. The system does not connect to live brokerages — all portfolio tracking is simulated (paper trading). The AI backbone is Claude on AWS Bedrock, integrated with free market data sources and orchestrated via Temporal workflows on top of the project template's Supabase data model.

## Goals

- Provide an accessible entry point for beginners to learn forex trading through guided, conversational AI interactions
- Deliver actionable currency pair recommendations driven by real-time market data, technical indicators, and sentiment analysis
- Offer a unified dashboard for market visualization, portfolio tracking, and risk assessment
- Automate market monitoring via Temporal workflows so users receive timely alerts without manual watching
- Operate entirely on free-tier data sources to keep infrastructure costs minimal during initial rollout

## Non-Goals

- This product does **not** execute real trades on behalf of users; it is advisory and educational only
- No integration with live brokerage accounts or order management systems in the initial release
- No proprietary or paid data feeds (Bloomberg, Refinitiv, CQG) — the system relies exclusively on free APIs
- No high-frequency or sub-second trading strategies; the minimum data granularity is 1-minute bars from free sources
- No regulatory compliance as a registered investment advisor — all outputs carry appropriate disclaimers

## User Stories

### As a new trader, I want to ask the AI which currencies are good for beginners so that I can start learning with low-risk pairs

**Acceptance Criteria:**
- [ ] User can open a chat and ask "What currencies should I trade as a beginner?" in natural language
- [ ] Claude responds with 3–5 recommended major pairs (e.g., EUR/USD, GBP/USD) with plain-language justifications
- [ ] Recommendations factor in current volatility and spread data to avoid suggesting unusually volatile pairs
- [ ] Response includes a brief explanation of why major pairs suit beginners (liquidity, tighter spreads, more predictable behavior)

### As someone new to forex, I want guided learning content so that I understand basic concepts before trading

**Acceptance Criteria:**
- [ ] A structured learning path is available with modules: "What is Forex?", "Reading Price Charts", "Understanding Pips & Lots", "Risk Management Basics", "Technical vs Fundamental Analysis"
- [ ] Each module has a completion state tracked per user
- [ ] The AI can answer follow-up questions within the context of the current module
- [ ] Progress is persisted across sessions via Supabase Auth + entity model

### As a trader, I want to see AI-generated market analysis for my watched currency pairs so that I can make informed decisions

**Acceptance Criteria:**
- [ ] User can maintain a watchlist of currency pairs
- [ ] Dashboard displays per-pair analysis: current price, 24h change, RSI, MACD signal, trend direction, and a Claude-generated narrative summary
- [ ] Analysis refreshes at configurable intervals (minimum every 15 minutes on free data tiers)
- [ ] Claude's narrative is grounded in the actual indicator values — no hallucinated numbers

### As a trader, I want alerts when technical indicators trigger on my watchlist so that I don't miss opportunities

**Acceptance Criteria:**
- [ ] User can create alert rules: "Notify me when EUR/USD RSI crosses below 30" or "When GBP/JPY breaks above 190.00"
- [ ] Alerts are evaluated by a Temporal scheduled workflow polling the data sources
- [ ] Notifications are delivered in-app (Supabase Realtime) and optionally via email
- [ ] Alert history is stored and queryable

### As a user, I want to track my paper trades and see P&L analytics so that I can improve my strategy

**Acceptance Criteria:**
- [ ] User can log simulated (paper) trades — no real brokerage connection (entry price, exit price, pair, direction, size, date)
- [ ] Dashboard shows cumulative paper P&L, win rate, average risk-reward ratio, and per-pair performance
- [ ] Claude can analyze the trade journal and provide improvement suggestions when asked
- [ ] All trade data is persisted in the entity model with SCD2 versioning for portfolio snapshots

## Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                          │
│  Vite + TanStack Router/Query + Tailwind 4 + Radix UI + Lucide    │
│  ┌──────────┐ ┌────────────┐ ┌───────────┐ ┌───────────────────┐  │
│  │ Chat UI  │ │ Dashboard  │ │ Portfolio │ │ Learning Center   │  │
│  └────┬─────┘ └─────┬──────┘ └─────┬─────┘ └────────┬──────────┘  │
│       │              │              │                 │             │
└───────┼──────────────┼──────────────┼─────────────────┼─────────────┘
        │              │              │                 │
        ▼              ▼              ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Supabase (API + Auth + Realtime)                 │
│  PostgREST API · GoTrue Auth · Realtime subscriptions · Storage    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL Database                       │   │
│  │  entities · entity_versions · relationships_v2              │   │
│  │  fact_types · entity_facts · time_series_points             │   │
│  │  dim_currency · dim_risk_level · dim_trade_status           │   │
│  │  dim_alert_type · dim_learning_level · dim_trade_signal    │   │
│  │  dim_indicator_type · chat_messages                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────────────────────────────┐  ┌──────────────────────┐
│          Temporal Workers            │  │  Supabase Edge       │
│          (Python 3.11)               │  │  Functions (Deno)    │
│                                      │  │  (request validation │
│  - Data ingest   - Alert eval        │  │   + Temporal trigger)│
│  - Sentiment     - Portfolio snap    │  └──────────────────────┘
│  - ChatWorkflow  - RecommendWorkflow │
│  - AnalyzeWorkflow                   │
│          │                           │
│          ▼                           │
│  ┌──────────────┐                    │
│  │  Claude on   │                    │
│  │  AWS Bedrock │                    │
│  │  (eu-west-1) │                    │
│  │  via boto3   │                    │
│  └──────────────┘                    │
└──────────────────┬───────────────────┘
                           │
          ┌────────────────┼────────────────────┐
          ▼                ▼                    ▼
   ┌────────────┐  ┌─────────────┐  ┌──────────────────┐
   │ Alpha      │  │ FRED API    │  │ News API /       │
   │ Vantage    │  │ ECB SDMX    │  │ Reddit / X       │
   │ Yahoo Fin  │  │ Open Exch.  │  │ Investing.com    │
   │ OANDA Demo │  │ Fixer.io    │  │ Economic Cal.    │
   └────────────┘  └─────────────┘  └──────────────────┘
     Price Data     Economic Data     Sentiment Data
```

**Why Claude Bedrock calls go through Temporal (not Edge Functions):** All Claude Bedrock calls are routed through the Temporal Python worker because: (a) `boto3` requires a Python runtime — Supabase Edge Functions run on Deno, (b) Temporal provides retry/timeout guarantees for LLM calls, (c) the worker runs in Docker with access to AWS credentials via IAM/environment variables, and (d) agentic tool-use loops map naturally to Temporal activity chains.

**Request flow — Chat example:**
1. User sends message via React chat component
2. Frontend calls Supabase Edge Function `/chat`
3. Edge Function validates the request, loads conversation history from `chat_messages`, and starts a Temporal `ChatWorkflow` via the Temporal HTTP API
4. Temporal `ChatWorkflow` activity calls Claude on Bedrock (`anthropic.claude-sonnet-5-5` for analysis or `anthropic.claude-haiku-5-5` for simple queries) via `boto3`, with a system prompt containing latest market facts from `entity_facts`
5. Temporal activity persists both user message and assistant response to the `chat_messages` table in Supabase
6. Supabase Realtime pushes the new assistant message to the frontend via channel subscription

**Request flow — Alert evaluation:**
1. Temporal cron workflow runs every 5 minutes
2. Activity fetches latest prices from Alpha Vantage / Yahoo Finance
3. Activity upserts `time_series_points` and derives `entity_facts`
4. Activity queries all active alerts and evaluates conditions
5. Triggered alerts insert a notification row; Supabase Realtime pushes to connected clients

### Data Model

#### Entity Types

| `entity_type` | Description | Example `source_record_id` |
|---|---|---|
| `currency` | An individual currency (EUR, USD, GBP) | `EUR` |
| `currency_pair` | A tradeable forex pair | `EUR/USD` |
| `user_profile` | Extended user profile (beyond Supabase Auth) | Supabase Auth UUID |
| `watchlist` | A user's list of watched currency pairs | `watchlist-{uuid}` |
| `portfolio` | A user's paper-trading portfolio | `portfolio-{uuid}` |
| `trade` | A single simulated trade entry (paper only) | `trade-{uuid}` |
| `alert` | A user-defined alert rule | `alert-{uuid}` |
| `learning_module` | A unit of educational content | `module-what-is-forex` |

#### Entity Versions (SCD2 snapshots)

| Entity Type | `data` JSONB contents |
|---|---|
| `user_profile` | `{ "display_name", "experience_level", "risk_tolerance", "preferred_pairs", "timezone", "notification_prefs" }` |
| `portfolio` | `{ "name", "currency", "initial_balance", "current_balance", "open_positions": [...] }` |
| `trade` | `{ "pair", "direction", "entry_price", "exit_price", "size", "status", "notes" }` |
| `alert` | `{ "pair", "condition_type", "threshold", "is_active", "last_triggered_at" }` |
| `currency_pair` | `{ "base", "quote", "pip_size", "typical_spread", "trading_hours", "description" }` |

#### Relationships

| `relationship_type` | `parent_id` type | `child_id` type |
|---|---|---|
| `pair_has_base_currency` | `currency_pair` | `currency` |
| `pair_has_quote_currency` | `currency_pair` | `currency` |
| `user_owns_watchlist` | `user_profile` | `watchlist` |
| `watchlist_contains_pair` | `watchlist` | `currency_pair` |
| `user_owns_portfolio` | `user_profile` | `portfolio` |
| `portfolio_contains_trade` | `portfolio` | `trade` |
| `user_has_alert` | `user_profile` | `alert` |
| `alert_watches_pair` | `alert` | `currency_pair` |
| `user_learning_progress` | `user_profile` | `learning_module` |

#### Fact Types

| `key` | `label` | `unit` | Description |
|---|---|---|---|
| `exchange_rate` | Exchange Rate | price | Latest bid price for a currency pair |
| `spread` | Spread | pips | Current bid-ask spread |
| `volatility_14d` | 14-Day Volatility | percent | 14-day historical volatility |
| `rsi_14` | RSI (14) | index | 14-period Relative Strength Index |
| `macd_signal` | MACD Signal | numeric | MACD histogram value |
| `sma_50` | 50-Period SMA | price | 50-period Simple Moving Average |
| `sma_200` | 200-Period SMA | price | 200-period Simple Moving Average |
| `sentiment_score` | Sentiment Score | score | Aggregated sentiment (-1 to +1) |
| `portfolio_pnl` | Portfolio P&L | currency | Cumulative profit/loss |
| `win_rate` | Win Rate | percent | Percentage of profitable trades |
| `avg_risk_reward` | Avg Risk:Reward | ratio | Average risk-to-reward ratio |
| `trade_count` | Trade Count | count | Number of trades in portfolio |

#### Time Series Events

| Fact Type Key | `data` JSONB payload | Source | Frequency |
|---|---|---|---|
| `exchange_rate` | `{ "bid", "ask", "mid", "source" }` | Alpha Vantage, Yahoo Finance | Every 5–15 min |
| `economic_indicator` | `{ "indicator", "value", "previous", "forecast", "country" }` | FRED, ECB | On release |
| `news_event` | `{ "headline", "source", "url", "relevance_score", "pairs_mentioned" }` | News API | Every 30 min |
| `sentiment_score` | `{ "source", "score", "volume", "keywords" }` | Reddit, X API | Every 1 hour |

#### Chat Messages (dedicated table — not stored in `time_series_points`)

Chat messages are not time-series metrics and should not pollute analytics queries. They are stored in a dedicated `chat_messages` table.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | `default gen_random_uuid()` |
| `user_id` | uuid (FK → Supabase Auth) | The user who owns this conversation |
| `conversation_id` | uuid | Groups messages into threads |
| `role` | text | `user` or `assistant` |
| `content` | text | Message body |
| `model` | text | Claude model ID used (e.g., `anthropic.claude-sonnet-5-5`) |
| `tokens_used` | int | Input + output tokens consumed |
| `created_at` | timestamptz | `default now()` |

#### Dimension Tables

**`dim_currency`**
| Column | Type | Example |
|---|---|---|
| `key` | text | `usd` |
| `label` | text | `US Dollar` |
| `symbol` | text | `$` |
| `country` | text | `United States` |
| `is_major` | boolean | `true` |
| `sort_order` | int | `1` |

**`dim_risk_level`**
| Column | Type | Example |
|---|---|---|
| `key` | text | `conservative` |
| `label` | text | `Conservative` |
| `max_leverage` | numeric | `5` |
| `max_position_pct` | numeric | `2` |
| `description` | text | `Low risk tolerance...` |

**`dim_trade_status`**
| Column | Type | Example |
|---|---|---|
| `key` | text | `open` |
| `label` | text | `Open` |
| `sort_order` | int | `1` |

Other values: `closed_profit`, `closed_loss`, `cancelled`

**`dim_alert_type`**
| Column | Type | Example |
|---|---|---|
| `key` | text | `price_cross_above` |
| `label` | text | `Price Crosses Above` |
| `description` | text | `Triggers when price crosses above threshold` |

Other values: `price_cross_below`, `rsi_overbought`, `rsi_oversold`, `macd_crossover`, `volatility_spike`

**`dim_learning_level`**
| Column | Type | Example |
|---|---|---|
| `key` | text | `beginner` |
| `label` | text | `Beginner` |
| `sort_order` | int | `1` |

Other values: `intermediate`, `advanced`

**`dim_trade_signal`**
| Column | Type | Example |
|---|---|---|
| `key` | text | `strong_buy` |
| `label` | text | `Strong Buy` |
| `sort_order` | int | `1` |
| `description` | text | `High-confidence bullish signal` |

Other values: `buy`, `neutral`, `sell`, `strong_sell`

**`dim_indicator_type`**
| Column | Type | Example |
|---|---|---|
| `key` | text | `momentum` |
| `label` | text | `Momentum Indicator` |
| `sort_order` | int | `1` |
| `description` | text | `Measures speed of price change` |

Other values: `trend`, `volatility`, `oscillator`

### API Design

#### Supabase Edge Functions

| Endpoint | Method | Description |
|---|---|---|
| `/chat` | POST | Validates request, starts Temporal `ChatWorkflow`. Accepts `{ message, conversation_id, context? }`. Response delivered via Supabase Realtime subscription. |
| `/recommend` | POST | Starts Temporal `RecommendWorkflow`. Accepts `{ user_id, risk_profile? }`. Returns workflow ID; results pushed via Realtime. |
| `/analyze` | POST | Starts Temporal `AnalyzeWorkflow`. Accepts `{ pair, timeframe? }`. Returns workflow ID; narrative + indicators pushed via Realtime. |
| `/alerts/evaluate` | POST | Webhook endpoint for Temporal to trigger alert notifications. |

#### Supabase PostgREST (auto-generated)

Standard CRUD via PostgREST for all tables. Key query patterns:

- `GET /rest/v1/entities?entity_type=eq.currency_pair` — list all currency pairs
- `GET /rest/v1/entity_facts?entity_id=eq.{pair_id}&select=*,fact_types(key,label,unit)` — all current facts for a pair
- `GET /rest/v1/time_series_points?entity_id=eq.{pair_id}&fact_type_id=eq.{rate_type}&order=observed_at.desc&limit=100` — price history
- `GET /rest/v1/entity_versions?entity_id=eq.{portfolio_id}&is_current=eq.true` — current portfolio state

#### Temporal Workflows

| Workflow | Schedule | Description |
|---|---|---|
| `PriceIngestionWorkflow` | Every 15 min | Fetches latest forex prices — primarily via `yfinance` (all 28 pairs in batch), supplemented by Alpha Vantage for select intraday pairs within the 25 req/day quota. Upserts into `time_series_points` and derives `entity_facts`. |
| `EconomicDataWorkflow` | Every 1 hour | Pulls economic indicators from FRED and ECB/Frankfurter APIs |
| `SentimentIngestionWorkflow` | Every 1 hour | Scrapes News API, Reddit, X for forex-related sentiment |
| `AlertEvaluationWorkflow` | Every 5 min (after price ingestion) | Evaluates all active alert rules against latest facts |
| `PortfolioSnapshotWorkflow` | Daily at 00:00 UTC | Snapshots portfolio values using closing prices |
| `TechnicalIndicatorWorkflow` | Every 15 min | Computes RSI, MACD, SMA from price time series and upserts derived facts |
| `ChatWorkflow` | On demand | Runs the Claude Bedrock agentic chat loop (tool-use cycle) via `boto3`; persists messages to `chat_messages` |
| `RecommendWorkflow` | On demand | Gathers user profile + pair facts, calls Claude Bedrock to rank and justify currency pair recommendations |
| `AnalyzeWorkflow` | On demand | Gathers pair facts + recent time series, calls Claude Bedrock to generate narrative market analysis |

### UI/UX Design

#### Page Structure (TanStack Router)

| Route | Component | Description |
|---|---|---|
| `/` | Landing / onboarding | Risk profile questionnaire for new users; dashboard redirect for returning users |
| `/chat` | Chat interface | Full-screen conversational AI with context-aware sidebar showing relevant pair data |
| `/dashboard` | Market dashboard | Watchlist with sparklines, key indicators, AI summary cards per pair |
| `/dashboard/:pair` | Pair detail | Full chart (TradingView widget), indicator panel, AI narrative, alert creation |
| `/portfolio` | Paper trading portfolio | Simulated trade journal, P&L chart, performance metrics, AI suggestions (no live brokerage) |
| `/learn` | Learning center | Module list with progress indicators, interactive content, in-context AI Q&A |
| `/alerts` | Alert management | Active alerts list, creation form, trigger history |
| `/settings` | User settings | Profile, risk tolerance, notification preferences, API key management |

#### Key UI Components

- **Chat Panel:** Persistent slide-out panel (Radix Dialog) available from any page; maintains conversation context; shows inline charts/data when AI references specific pairs
- **Pair Card:** Reusable card component showing pair name, current rate, 24h change (color-coded), mini sparkline (last 24h), RSI badge, AI sentiment indicator
- **Indicator Gauge:** Radix-based gauge components for RSI (0–100), sentiment (-1 to +1), volatility (low/med/high)
- **Trade Entry Form:** Radix Dialog form for logging trades with pair selector, direction toggle, price inputs, optional stop-loss/take-profit
- **Learning Module:** Accordion-based content with markdown rendering, embedded examples, progress checkbox

## Implementation Plan

### Phase 1: Core Infrastructure (Weeks 1–3)

*(Assumes 2–3 full-time developers)*

- [ ] Create Supabase migration `20261111120000_forex_core_entities.sql` — `dim_currency`, `dim_risk_level`, `dim_trade_status`, `dim_alert_type`, `dim_learning_level`, `dim_trade_signal`, `dim_indicator_type` tables + `chat_messages` table
- [ ] Create migration `20261111120001_forex_fact_types.sql` — seed all `fact_types` (exchange_rate, spread, volatility, RSI, MACD, SMA, sentiment, portfolio metrics)
- [ ] Create migration `20261111120002_forex_seed_currencies.sql` — seed `entities` for individual currencies and 28 major/minor/exotic pairs; seed `dim_currency` with all referenced currencies
- [ ] Create migration `20261111120003_forex_rls_policies.sql` — RLS policies for all tables (public read on pairs/facts, user-scoped for profiles/portfolios/trades/alerts/chat_messages)
- [ ] Implement Temporal `PriceIngestionWorkflow` — activities: `fetch_yahoo_finance` (primary, batch all pairs), `fetch_alpha_vantage` (supplementary intraday, within 25 req/day), `upsert_price_data`, `derive_exchange_rate_fact`
- [ ] Implement Temporal `EconomicDataWorkflow` — activities: `fetch_fred_data`, `fetch_ecb_rates`, `fetch_frankfurter`, `upsert_economic_events`
- [ ] Create Supabase Edge Function `/chat` — validates request, starts Temporal `ChatWorkflow`; the Temporal Python worker calls Claude Bedrock via `boto3` and persists messages to `chat_messages`
- [ ] Implement Temporal `ChatWorkflow` — activities: `load_conversation_history`, `call_bedrock` (with system prompt containing latest `entity_facts`), `persist_messages`
- [ ] Frontend: scaffold routes in TanStack Router, implement basic chat interface with Supabase Realtime subscription for streamed responses
- [ ] Frontend: onboarding flow — risk profile questionnaire that creates `user_profile` entity with versioned preferences

### Phase 2: Intelligence Layer (Weeks 4–6)

- [ ] Implement Temporal `TechnicalIndicatorWorkflow` — compute RSI-14, MACD (12,26,9), SMA-50, SMA-200 from price time series; upsert as `entity_facts`
- [ ] Implement Temporal `SentimentIngestionWorkflow` — activities: `fetch_news_api`, `fetch_reddit_sentiment`, `score_sentiment` (Claude Bedrock call to classify headlines), `upsert_sentiment_facts`
- [ ] Create Supabase Edge Function `/recommend` + Temporal `RecommendWorkflow` — Edge Function validates and triggers workflow; workflow queries user profile (risk level, experience) and all pair facts, calls Claude Bedrock via `boto3` to rank and justify recommendations
- [ ] Create Supabase Edge Function `/analyze` + Temporal `AnalyzeWorkflow` — Edge Function validates and triggers workflow; workflow gathers facts + recent time series, calls Claude Bedrock via `boto3` to generate narrative market analysis
- [ ] Implement risk assessment logic — position sizing calculator based on portfolio balance, risk tolerance dim, and pair volatility; warn on overexposure (>5% single pair for conservative, >10% for aggressive)
- [ ] Enhance chat system prompt with tool-use: Claude can call `get_pair_data`, `get_portfolio_summary`, `get_economic_calendar` as tools during conversation

### Phase 3: User Experience (Weeks 7–10)

- [ ] Frontend: Market Dashboard page — watchlist management, `PairCard` components with live data via TanStack Query polling, AI summary cards
- [ ] Frontend: Pair Detail page — embed TradingView free widget for charting, indicator panel reading from `entity_facts`, AI narrative section
- [ ] Frontend: Paper Trading Portfolio — simulated trade journal CRUD (log paper trades via Radix form), P&L line chart, performance metrics cards (win rate, avg R:R, total P&L)
- [ ] Frontend: Alert Management — create/edit/delete alert rules, alert type selector (Radix Select from `dim_alert_type`), trigger history table
- [ ] Implement Temporal `AlertEvaluationWorkflow` — evaluate conditions against `entity_facts`, insert notification rows, push via Supabase Realtime
- [ ] Frontend: Learning Center — module list with progress, markdown content renderer, in-module AI chat, completion tracking
- [ ] Create migration `20261111120004_forex_learning_content.sql` — seed `learning_module` entities and their versioned content
- [ ] Implement Temporal `PortfolioSnapshotWorkflow` — nightly snapshot of portfolio positions at closing prices as `entity_versions`

### Phase 4: Advanced Features (Weeks 11–14)

- [ ] Backtesting engine — Temporal workflow that replays historical `time_series_points` against a user-defined strategy, outputs performance metrics
- [ ] Strategy builder UI — visual rule builder (if RSI < 30 AND MACD crossover, then BUY) stored as JSONB in alert entity versions
- [ ] Multi-timeframe analysis — 1H, 4H, Daily, Weekly views with aligned technical indicators
- [ ] Social features — anonymized leaderboard of paper-trading performance, strategy sharing
- [ ] Email notifications via Supabase Auth hooks or external SMTP integration for alert delivery
- [ ] Mobile-responsive refinements and PWA support

## Testing Strategy

### Unit Tests
- Temporal activity functions: mock API responses, verify correct `time_series_points` and `entity_facts` output shapes
- Technical indicator calculations: known-input/known-output tests for RSI, MACD, SMA against reference implementations
- Risk assessment logic: boundary tests for position sizing and overexposure warnings

### Integration Tests
- `supabase db reset` — verify all migrations apply cleanly and seed data is consistent
- Temporal workflow end-to-end: start workflow, verify database state after completion
- Edge Function → Temporal workflow → Claude Bedrock → response pipeline with mocked Bedrock responses

### E2E Tests
- Chat flow: send message → receive streamed response → verify persistence
- Alert lifecycle: create alert → price triggers condition → notification received
- Portfolio trade logging → P&L calculation → AI analysis request

### Performance Tests
- Price ingestion workflow under load: 28 pairs x every 15 min = 2,688 inserts/day minimum
- Dashboard query latency: `entity_facts` join with `fact_types` for 10 watchlist pairs < 200ms
- Claude Bedrock response latency: p95 < 5s for chat, < 10s for full analysis

## Rollout Plan

1. **Local Development** — Docker Compose stack with Supabase CLI, all free API keys configured in `.env`
2. **Internal Alpha** — Deploy to dev namespace (Helm chart `values-dev.yaml`), team-only access via Supabase Auth allow-list
3. **Closed Beta** — Deploy to test environment, invite 20–50 users, collect feedback on recommendations quality and UX
4. **Public Beta** — Open registration, monitor Bedrock usage costs, implement rate limiting on `/chat` and `/analyze` endpoints
5. **GA** — Production deployment with monitoring dashboards, alerting on API quota exhaustion, and user feedback loops

## Metrics & Success Criteria

| Metric | Target | Measurement |
|---|---|---|
| Daily Active Users (DAU) | 100+ within 3 months of public beta | Supabase Auth session tracking |
| Chat messages per user per day | ≥ 3 | Count `chat_messages` per user per day |
| Recommendation engagement | ≥ 40% of recommendations viewed lead to user adding pair to watchlist | Track watchlist additions after recommendation viewed |
| Alert trigger latency | < 2 minutes from condition met to notification | Temporal workflow metrics |
| Learning module completion rate | ≥ 40% of beginners complete Module 1 within 7 days | Entity relationship `user_learning_progress` tracking |
| Paper trading adoption | ≥ 30% of active users log at least 1 paper trade | Entity count query |
| System uptime | ≥ 99.5% | Infrastructure monitoring |
| Claude Bedrock cost per user per month | < $2.00 | AWS Cost Explorer tagging |

## Dependencies

- **AWS Bedrock access** — Claude model enabled in eu-west-1 (confirmed: account 502244073085, `BedrockDeveloperAccess` role)
- **Free API keys** — Alpha Vantage, News API, FRED, Open Exchange Rates (each requires individual registration)
- **Supabase CLI** — local development stack
- **Docker Desktop** — for Compose-based local environment
- **Temporal Cloud or self-hosted** — production Temporal cluster (dev uses Docker Compose)
- **TradingView widget license** — free widgets are licensed for non-commercial use only. Before public beta, either: (a) purchase a TradingView commercial license, or (b) replace with an open-source charting library (e.g., `lightweight-charts` by TradingView, which is Apache-2.0 licensed)

## Free Data Sources Reference

| Source | Data Type | Free Tier Limits | Use Case |
|---|---|---|---|
| Yahoo Finance (yfinance) | Historical + current forex OHLC | Unlimited (unofficial) | Primary price data — batch all 28 pairs every 15 min |
| Alpha Vantage | Forex intraday/daily/weekly OHLC | 25 req/day (free key) | Supplementary intraday detail for top ~8 watched pairs |
| OANDA Demo API | Streaming forex prices | Demo account required | Real-time price streaming |
| ECB SDMX API | EUR reference rates | Unlimited | Official EUR cross rates |
| Frankfurter API | ECB data via REST JSON | Unlimited (open source) | Daily EUR reference rates (mirrors ECB) |
| Open Exchange Rates | 170+ currencies daily rates | 1,000 req/month | Exotic pair coverage |
| Fixer.io | Historical and real-time rates | 100 req/month (free) | Rate verification / fallback |
| Exchange Rates API | Daily exchange rates | 1,500 req/month | Secondary rate source |
| 1Forge Forex API | Real-time quotes | 1,000 req/day | Supplementary live quotes |
| FRED API | Interest rates, CPI, GDP, employment | Unlimited (with key) | Economic indicator analysis |
| News API | Financial news headlines | 100 req/day (developer) | News-based sentiment input |
| Reddit API | r/forex, r/trading posts and comments | 100 req/min (free) | Social sentiment |
| Twitter/X API (Free) | Financial tweets | 1,500 tweets read/month | Influencer sentiment |
| Investing.com | Economic calendar events | Web scraping (free) | Scheduled event awareness |
| TradingView Widgets | Embeddable interactive charts | Free (non-commercial) | Frontend charting |

### Data Source Aggregation Strategy

Because no single free API provides sufficient rate limits, the system uses a **tiered fallback** strategy:
1. **Primary price data:** Yahoo Finance (`yfinance`) — batch-fetch all 28 pairs every 15 minutes (no official rate limit; unofficial API, monitor for breakage)
2. **Supplementary intraday:** Alpha Vantage — 25 req/day budget, used for detailed intraday OHLC on the top ~8 most-watched pairs (roughly 3 pairs per request = 8 pairs/day with headroom)
3. **Streaming supplement:** OANDA demo — real-time streaming ticks on the 8 major pairs (requires demo account registration)
4. **Daily baseline & cross-validation:** ECB SDMX + Frankfurter (unlimited) + Open Exchange Rates (1,000 req/month) — official reference rates for end-of-day reconciliation
5. **Economic data:** FRED (120 req/min) + ECB/Frankfurter for macroeconomic indicators
6. **Sentiment:** News API (100 req/day) + Reddit API (100 req/min) + X API (1,500 tweets/month), scored by Claude Bedrock via Temporal `SentimentIngestionWorkflow`

Temporal workflows stagger requests across sources to stay within free-tier limits. A `data_source_quota` table (extension of `entity_facts`) tracks daily usage per API key to prevent overages.

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Free API rate limits are too restrictive for real-time use | High | High | Implement aggressive caching in `entity_facts`; stagger requests across multiple sources; use OANDA demo for streaming on priority pairs |
| Claude Bedrock costs scale unpredictably with user growth | High | Medium | Implement per-user daily token budgets; use Haiku for simple queries, Sonnet for analysis; cache common responses |
| Yahoo Finance unofficial API breaks or blocks | Medium | Medium | Maintain fallback to Alpha Vantage + ECB; abstract data source behind activity interface for easy swap |
| Recommendation quality is poor, eroding user trust | High | Medium | Include confidence scores and disclaimers; backtest recommendations weekly; allow user feedback on quality |
| Users treat advisory output as financial advice, creating liability | High | Low | Prominent disclaimers on every recommendation; terms of service explicitly state "not financial advice"; no real-money trade execution |
| Temporal workflow failures cause stale data | Medium | Low | Implement dead-letter queues, retry policies, and staleness indicators in the UI; alert on workflow failure rate |
| Data source inconsistencies across providers | Medium | Medium | Cross-validate rates across 2+ sources; flag and quarantine outliers before inserting into `entity_facts` |

## Open Questions

- [ ] Should the system support multiple simultaneous conversation threads, or a single continuous thread per user?
- [ ] What is the maximum acceptable data staleness for the dashboard? (5 min? 15 min? Free APIs may force 15+ min delays.)
- [ ] Should paper trading support leverage simulation, or only track spot positions?
- [ ] Is email notification delivery a Phase 3 requirement, or can it be deferred to Phase 4?
- [ ] Should learning content be authored in markdown in the repo, or managed via a CMS / Supabase Storage?
- [ ] What Claude Bedrock model should be default — Sonnet 5.5 (better analysis, higher cost) or Haiku 5.5 (cheaper, faster, suitable for simple queries)?

## References

- [Project README](../../README.md) — Boilerplate stack overview and quick start
- [Database Template Guide](../../DATABASE.md) — Core entity model and SCD2 conventions
- [Implementation Guide](../../Guide_for_agents_using_supabase_template.md) — How to use entities, facts, time series, dimensions
- [Generalisable Schema](../../Generalisable_schema.md) — Schema specification for fact_types, entity_facts, time_series_points
- [Alpha Vantage Forex Docs](https://www.alphavantage.co/documentation/#fx) — API reference for forex endpoints
- [FRED API Docs](https://fred.stlouisfed.org/docs/api/fred/) — Economic data API
- [AWS Bedrock Claude Docs](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-claude.html) — Claude model invocation reference
- [Temporal Python SDK](https://docs.temporal.io/develop/python) — Workflow and activity development guide
- [TanStack Query Docs](https://tanstack.com/query/latest) — Data fetching and caching for React
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime) — Real-time subscriptions for notifications
