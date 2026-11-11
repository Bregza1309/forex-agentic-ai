# ADR-001: Forex Agentic AI — Architecture & Tech Stack

**Status:** Proposed  
**Date:** 2026-11-11  
**Deciders:** Brendon Muchesa, AI Accelerator Team  
**Technical Story:** Design a Forex Agentic AI personal assistant that helps traders and beginners discover which currency pairs to trade, using the existing boilerplate stack (Supabase + Temporal + Vite/React) with Claude on AWS Bedrock as the AI backbone and free market-data sources.

## Context

Retail forex trading has a steep learning curve. New traders need help understanding which currency pairs to watch, what market conditions mean, and when to act. Experienced traders want faster analysis and sentiment-aware alerts. We need an **agentic AI assistant** that can:

1. Conversationally guide users through forex concepts and pair selection.
2. Continuously ingest exchange-rate data and economic indicators from free APIs.
3. Derive technical indicators (RSI, MACD, moving averages) and sentiment scores.
4. Proactively surface trade ideas, alerts, and risk assessments.
5. Present everything in a real-time dashboard with an embedded chat interface.

The project will be built on the existing **boilerplate stack** (Supabase, Temporal, Vite + React + TanStack, Docker Compose) to minimize scaffolding effort. The key architectural choices are documented below.

## Decision

We adopt the following six architectural decisions as a cohesive whole.

---

### 1. Claude on AWS Bedrock as the AI Backbone

**Choice:** Use Anthropic Claude models via the AWS Bedrock `InvokeModel` / `Converse` API in `eu-west-1` — Claude Sonnet 5.5 for market analysis and complex reasoning, Claude Haiku 5.5 for simple chat responses and quick lookups, with Opus 5.5 available for the most demanding multi-step agentic tasks.

**Rationale:**
- The team already has Bedrock access via the `BedrockDeveloperAccess` SSO role in account `502244073085`.
- IAM-based authentication eliminates API key management and rotation; credentials are scoped through the existing SSO assume-role chain.
- Data stays within the AWS boundary — no external API calls carrying potentially sensitive user portfolio data.
- Claude models excel at nuanced financial reasoning, multi-step analysis, and tool-use patterns needed for an agentic loop (e.g., calling a "get_exchange_rate" tool, interpreting the result, then calling a "calculate_rsi" tool).
- Bedrock's pay-per-token pricing with no upfront commitment fits an MVP budget.

**Alternatives considered:**

| Option | Pros | Cons |
|--------|------|------|
| Direct Anthropic API | Simpler setup, latest models first | API key management, data leaves AWS, less enterprise governance |
| OpenAI API (GPT-4o) | Large ecosystem, function-calling support | Different model family, less nuanced long-form reasoning for financial analysis, separate billing relationship |
| Self-hosted open-source (Llama 3, Mistral) | No per-token cost, full control | High GPU infrastructure cost, significantly worse reasoning quality, heavy ops burden |
| Azure OpenAI | Enterprise-grade, GPT-4o access | Different cloud provider from existing infrastructure, requires Azure subscription and networking |

---

### 2. Temporal for Forex Data Pipeline Orchestration

**Choice:** Use Temporal (Python SDK, already in the Docker Compose stack) for all scheduled data ingestion, analysis pipelines, alert workflows, and agentic AI orchestration.

**Rationale:**
- Already included in the boilerplate (`temporalio/auto-setup:1.21.3`, Python worker with `temporalio==1.5.0`).
- Forex data ingestion is inherently a set of **scheduled, retryable, multi-step workflows**: fetch rates from API A, fall back to API B on failure, parse response, store in Supabase, derive indicators, check alert thresholds, notify users.
- Built-in retry policies and timeouts handle flaky free-tier APIs gracefully.
- The Temporal UI (`localhost:8080`) provides full workflow visibility for debugging failed data fetches.
- Python SDK aligns with data-science libraries (pandas, ta-lib, numpy) needed for technical indicator calculations.
- Agentic AI loops (Claude tool-use cycles) map naturally to Temporal activities: each tool call is an activity, the workflow orchestrates the loop with timeout and retry guarantees.
- **All Claude Bedrock calls are routed through Temporal Python workers**, not Supabase Edge Functions. This is a deliberate choice: `boto3` (the AWS SDK for calling Bedrock) requires Python; Temporal provides retry and timeout guarantees for LLM calls that may take 10–30 seconds; the worker container has AWS credentials injected via environment variables; and multi-turn agentic tool-use loops (where Claude calls tools iteratively) map naturally to a chain of Temporal activities with durable state. Supabase Edge Functions (Deno-based) serve only as lightweight API proxies that start Temporal workflows and return immediately.

**Alternatives considered:**

| Option | Pros | Cons |
|--------|------|------|
| Celery + Redis | Lightweight, Python-native | No built-in UI, harder to debug, no native workflow-as-code, less visibility into running tasks |
| Apache Airflow | Mature scheduler, DAG visualization | Overkill for this use case, heavy resource footprint, DAG-based model less suited to dynamic agentic loops |
| Cron jobs | Zero infrastructure | No retry logic, no visibility, no workflow state, single point of failure |
| AWS Step Functions | Managed, serverless | Vendor lock-in, JSON-based state machine harder to iterate on, separate from local dev stack |

---

### 3. Supabase as the Data Layer

**Choice:** Use the local Supabase stack (Postgres 15 + PostgREST + Auth + Realtime + Studio) already provided by the boilerplate.

**Rationale:**
- Already in the stack — `supabase start` gives us Postgres, Auth, Realtime, and Studio with zero additional setup.
- **Realtime subscriptions** are critical: when new exchange-rate data lands in Postgres, the frontend receives it instantly via Supabase Realtime channels — no polling needed for the live price ticker.
- **Built-in Auth** (email/password, social OAuth) handles user sign-up/login with minimal code; JWT tokens integrate directly with Row-Level Security.
- **Row-Level Security (RLS)** enables multi-tenant data isolation: each user sees only their own portfolios, watchlists, and alerts.
- **PostgREST API** lets the frontend query entities, facts, and time-series data without a custom backend.
- **Studio** (`localhost:54323`) provides an admin interface for inspecting forex data during development.

**Edge Function limitation note:** Supabase Edge Functions run on the Deno runtime and cannot use Python libraries such as `boto3`. This means Edge Functions **cannot directly call AWS Bedrock**. Instead, Edge Functions serve as lightweight API proxies: they validate requests, start Temporal workflows (via HTTP signal), and return immediately. The Temporal Python worker handles all Claude Bedrock interactions using `boto3` with AWS credentials from its container environment. Responses are written to Supabase, and Realtime pushes them to the frontend.

**Alternatives considered:**

| Option | Pros | Cons |
|--------|------|------|
| Raw Postgres | Full control, no abstraction | Lose Realtime, Auth, Studio; must build API layer from scratch |
| Firebase | Realtime database, generous free tier | NoSQL (document store) — poor fit for relational forex data, entity graphs, and joins across facts/dimensions |
| PlanetScale | Managed MySQL, branching | No built-in realtime, no auth, MySQL dialect lacks Postgres JSONB power |
| MongoDB Atlas | Flexible schema, change streams | Document store loses relational integrity needed for entity-fact-dimension model |

---

### 4. Existing Entity-Graph Data Model for the Forex Domain

**Choice:** Map all forex domain concepts onto the template's core + analytics schema (`entities`, `entity_versions`, `relationships_v2`, `fact_types`, `entity_facts`, `time_series_points`) and add forex-specific dimension tables.

**Domain mapping:**

| Forex Concept | Template Table | Details |
|---------------|---------------|---------|
| Currency pair (EUR/USD) | `entities` (type: `currency_pair`) | `source_record_id` = ISO code like `EURUSD` |
| Individual currency (EUR) | `entities` (type: `currency`) | Used for relationship modeling |
| User | `entities` (type: `user_profile`) | Linked to Supabase Auth via `source_record_id` |
| Portfolio | `entities` (type: `portfolio`) | Owned by user via `relationships_v2` |
| Watchlist | `entities` (type: `watchlist`) | Owned by user via `relationships_v2` |
| Trade (simulated) | `entities` (type: `trade`) | Paper trading for beginners |
| Alert rule | `entities` (type: `alert`) | User-defined price/indicator alert |
| Learning module | `entities` (type: `learning_module`) | Educational content unit (e.g., "What is Forex?") |
| Exchange rate tick | `time_series_points` | `data`: `{"bid": 1.0842, "ask": 1.0845, "mid": 1.08435}` |
| Economic indicator | `time_series_points` | `data`: `{"value": 3.2, "indicator": "CPI", "country": "US"}` |
| RSI / MACD / SMA | `entity_facts` | Derived from time-series; `value` = numeric indicator value |
| Sentiment score | `entity_facts` | Derived from news/social; `value` = -1.0 to 1.0 |
| AI recommendation | `entity_facts` | `value` = confidence score; `dimension_id` -> `dim_trade_signal` |

**New dimension tables:**

| Table | Purpose | Example rows |
|-------|---------|-------------|
| `dim_currency` | Currency metadata (name, symbol, country, region) | `{key: "EUR", label: "Euro", country: "Eurozone"}` |
| `dim_risk_level` | Risk classification for pairs/trades | `{key: "high", label: "High Risk", sort_order: 3}` |
| `dim_trade_signal` | AI recommendation types | `{key: "strong_buy", label: "Strong Buy", sort_order: 1}` |
| `dim_trade_status` | Paper trade lifecycle | `{key: "open", label: "Open"}, {key: "closed", label: "Closed"}` |
| `dim_alert_type` | Alert categories | `{key: "price_target", label: "Price Target Hit"}` |
| `dim_indicator_type` | Technical indicator classification | `{key: "momentum", label: "Momentum Indicator"}` |
| `dim_learning_level` | Learning path levels | `{key: "beginner", label: "Beginner", sort_order: 1}` |

**Rationale:**
- Reuses the proven schema — no new table patterns to invent or maintain.
- SCD2 versioning on `entity_versions` gives free historical tracking of portfolio changes and pair configurations.
- JSONB `data` in `time_series_points` handles varied API response shapes (Alpha Vantage vs. ECB vs. FRED all return different JSON structures).
- The `fact_types` registry cleanly separates metric definitions (RSI, MACD, sentiment) from the data itself; adding a new indicator means one `INSERT INTO fact_types`, not a schema change.
- `entity_facts` with dimension references enables queries like "show me all currency pairs where the AI signal is Strong Buy and risk level is Low."

---

### 5. Free Data Sources Strategy

**Choice:** Use a tiered set of free APIs and data feeds, organized by reliability and update frequency.

#### Tier 1 — Exchange Rates (Primary)

| Source | Data | Free Tier Limits | Update Frequency |
|--------|------|-------------------|------------------|
| **Alpha Vantage** | Real-time & historical FX rates, intraday, daily | 25 requests/day (free key) | Near real-time (with delay) |
| **European Central Bank (ECB)** | EUR-based reference rates, 30+ currencies | Unlimited, public XML/CSV feed | Daily at ~16:00 CET |
| **Federal Reserve (FRED API)** | USD exchange rates, interest rates, economic indicators | 120 requests/min (free key) | Daily / monthly depending on series |
| **ExchangeRate-API** | 160+ currencies, historical rates | 1,500 requests/month (free) | Daily |
| **Open Exchange Rates** | 170+ currencies, historical | 1,000 requests/month (free) | Hourly |
| **Frankfurter** | ECB data via REST JSON API | Unlimited, open-source | Daily (mirrors ECB) |

#### Tier 2 — Economic & Fundamental Data

| Source | Data | Free Tier Limits |
|--------|------|-------------------|
| **FRED API** | GDP, CPI, unemployment, interest rates, trade balances for 80+ countries | 120 req/min |
| **World Bank Open Data API** | Macro-economic indicators, country data | Unlimited |
| **IMF Data API** | Balance of payments, exchange rate archives | Unlimited |
| **Yahoo Finance** (via `yfinance` Python library) | FX rates, historical OHLCV, news headlines (also serves as **primary batch price source** — see ingestion strategy) | Unofficial, rate-limited |

#### Tier 3 — Sentiment & News

| Source | Data | Free Tier Limits |
|--------|------|-------------------|
| **News API** (`newsapi.org`) | Headlines from 150k+ sources, keyword search | 100 requests/day (developer) |
| **Reddit API** | Posts from r/forex, r/trading, r/economics | 100 requests/min (OAuth, free) |
| **GDELT Project** | Global news events, tone analysis | Unlimited, public BigQuery dataset |
| **Financial Modeling Prep** | Forex news, economic calendar | 250 requests/day (free) |

#### Tier 4 — Embeddable Visualization

| Source | Use | Limits |
|--------|-----|--------|
| **TradingView Widgets** | Embeddable advanced charts, mini charts, tickers | Free for non-commercial / with attribution |

**Ingestion strategy:**
- Temporal workflows rotate across Tier 1 sources to stay within rate limits.
- ECB + Frankfurter (unlimited) serve as the reliable daily baseline.
- Alpha Vantage and FRED provide intraday and economic data within their quotas.
- Sentiment data (Tier 3) is fetched less frequently (every 1-4 hours) to stay within free limits.
- All raw API responses are stored in `time_series_points.data` as JSONB; derived metrics are upserted into `entity_facts`.

**Tradeoff acknowledged:** Free tiers introduce 15-minute to daily delays. This is acceptable because the AI assistant focuses on **analysis, education, and medium-term recommendations** — not high-frequency or algorithmic trading. Users are explicitly informed that data may be delayed.

---

### 6. Vite + React + TanStack Frontend with JSON-Driven UI Engine

**Choice:** Build the forex dashboard and chat interface using the existing frontend stack (Vite, React 18, TanStack Router + Query, Tailwind CSS 4, Radix UI, JSON-driven engine).

**Rationale:**
- Already scaffolded in the boilerplate with component library (Radix), styling (Tailwind), and routing (TanStack Router).
- **TanStack Query** provides automatic background refetching, cache invalidation, and optimistic updates — ideal for polling forex rates and refreshing dashboard widgets.
- **Supabase Realtime integration**: subscribe to `time_series_points` inserts and update the price ticker without explicit polling.
- **JSON-driven UI engine** (under `src/engine/`) allows rapid iteration on dashboard layouts — add a new chart panel or indicator widget by editing a JSON page definition, not writing new React components.
- **Radix UI** provides accessible, unstyled primitives for dialogs (trade confirmation), tooltips (indicator explanations), tabs (multi-pair comparison), and selects (currency pair picker).

**Key frontend features to build:**

| Feature | Implementation |
|---------|---------------|
| Live price ticker | Supabase Realtime subscription on `time_series_points` + TanStack Query |
| AI chat interface | Frontend sends message via Edge Function → Edge Function starts Temporal workflow → Python worker calls Claude Bedrock via `boto3` → response stored in Supabase → Realtime pushes to frontend |
| Currency pair dashboard | JSON-driven page definition, TanStack Query for `entity_facts` |
| Portfolio tracker | CRUD via Supabase PostgREST, Realtime for live P&L |
| Alert manager | Supabase CRUD + Temporal alert-check workflow |
| TradingView charts | Embedded widget via iframe / lightweight charting library |

---

## Consequences

### Positive

- **Zero-cost MVP data pipeline:** Free-tier APIs provide enough data for analysis and education without commercial contracts.
- **Full-stack coherence:** Every layer (DB, backend, frontend, AI) is already wired together in the boilerplate — no glue code to write from scratch.
- **Enterprise-ready AI:** Bedrock + IAM means no API keys in `.env` files, audit trails via CloudTrail, and data residency in eu-west-1.
- **Real-time UX:** Supabase Realtime + TanStack Query deliver live price updates to the browser without custom WebSocket infrastructure.
- **Extensible domain model:** Adding a new currency pair, indicator, or data source means inserting rows (entities, fact_types), not changing schemas.
- **Agentic AI with guardrails:** Temporal orchestrates the Claude tool-use loop with timeouts and retries, preventing runaway token spend or infinite loops.
- **Beginner-friendly:** The AI assistant can explain forex concepts conversationally while the dashboard provides visual context — lowering the barrier to entry.

### Negative

- **Data delays:** Free-tier sources are delayed 15 minutes to 1 day; not suitable for scalping or high-frequency strategies. Users must be clearly informed.
- **Rate-limit complexity:** Juggling multiple free APIs with different quotas adds orchestration complexity in Temporal workflows (rotation, fallback, backoff).
- **Bedrock model availability:** Not all Claude models are available in all Bedrock regions simultaneously; eu-west-1 availability must be verified per model version.
- **Temporal operational overhead:** Running Temporal locally is simple, but production deployment requires a managed Temporal Cloud instance or self-hosted cluster with monitoring.

### Neutral

- **Paper trading only (by design):** This is an analysis and education tool; integrating with real brokers (e.g., OANDA, Interactive Brokers) is a deliberate non-goal for the initial release, requiring a future ADR if pursued.
- The JSONB-heavy approach trades query ergonomics (no typed columns for bid/ask/mid) for schema flexibility. This is acceptable for an MVP; views or generated columns can add structure later.
- The Python Temporal worker handles both data ingestion and AI orchestration. If these workloads diverge in resource needs, they can be split into separate task queues without architectural change.
- TradingView widget embedding provides professional-grade charts for free but introduces a third-party dependency in the frontend.

### Cost Estimates (MVP — 100 users)

| Component | Dev/Local Cost | Production Estimate | Notes |
|-----------|---------------|-------------------|-------|
| **Claude Bedrock (Sonnet 5.5)** | Pay-per-token | ~$54/month | ~$3/M input, ~$15/M output tokens. Avg 2K input + 1K output per turn, 10 turns/user/day. Used for market analysis and complex reasoning. |
| **Claude Bedrock (Haiku 5.5)** | Pay-per-token | ~$4.50/month | ~$0.25/M input, ~$1.25/M output. Same usage pattern. Used for simple chat and quick lookups. |
| **Blended AI cost** | — | ~$20–30/month | Strategy: route simple queries to Haiku, analysis to Sonnet. Estimated ~60% Haiku / 40% Sonnet split. |
| **Temporal** | $0 (Docker Compose) | Usage-based (Temporal Cloud) or self-hosted | Dev is free. Production Temporal Cloud pricing is action-based. |
| **Supabase** | $0 (local CLI) | ~$25/month (Pro plan) | Includes Postgres, Auth, Realtime, 8GB DB, 250MB storage. |
| **Free API data sources** | $0 | $0 | Within free-tier rate limits. |
| **Infrastructure (compute)** | $0 (local Docker) | ~$20–40/month | Small VM or container service for Temporal worker + frontend. |
| **Total estimated MVP** | **$0** | **< $100/month** | For 100 users; scales primarily with Bedrock token usage. |

## Options Considered

See per-decision alternative tables above. The overarching alternative was to build a standalone FastAPI + Next.js application from scratch, which was rejected because:
- It would duplicate infrastructure already proven in the boilerplate.
- It would require weeks of scaffolding (auth, real-time, entity model, deployment) that the template provides out of the box.
- The entity-graph model is already a good fit for the forex domain.

## Related Decisions

- Future ADR needed for: broker integration strategy (if moving beyond paper trading).
- Future ADR needed for: production Temporal deployment (Temporal Cloud vs. self-hosted).
- Future ADR needed for: upgrading to paid data sources when free-tier limits become a bottleneck.

## Notes

- The `BedrockDeveloperAccess` SSO role in account `502244073085` (eu-west-1) is confirmed working as of 2026-11-11.
- Alpha Vantage requires a free API key (register at alphavantage.co); FRED requires a free API key (register at fred.stlouisfed.org); News API requires a free developer key (register at newsapi.org). ECB, Frankfurter, World Bank, and IMF APIs require no authentication.
- The forex domain introduces no changes to the core template tables (`entities`, `entity_versions`, `relationships_v2`, `fact_types`, `entity_facts`, `time_series_points`); all customization is via new dimension tables and seed data.
