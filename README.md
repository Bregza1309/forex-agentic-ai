# Forex Agentic AI — Personal Trading Assistant

An AI-powered forex trading assistant built on Claude (AWS Bedrock) that helps beginners discover which currencies to trade and provides experienced traders with market analysis, alerts, and portfolio tracking.

> **Disclaimer:** This is an educational and analytical tool only. It does not execute real trades or provide financial advice. All trading features use paper/simulated trades. Past performance of AI recommendations does not guarantee future results.

## Features

- **AI Chat** — Conversational assistant powered by Claude Sonnet 5.5 / Haiku 5.5 on AWS Bedrock
- **Market Dashboard** — Real-time currency pair data with technical indicators (RSI, MACD, SMA)
- **Currency Pair Recommendations** — AI-analyzed suggestions based on your risk profile
- **Paper Trading Portfolio** — Track simulated trades with P&L analytics
- **Alert System** — Price and indicator-based alerts via Temporal workflows
- **Learning Center** — Guided forex education for beginners
- **Sentiment Analysis** — News and social media sentiment scoring

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI | Claude on AWS Bedrock (Sonnet 5.5, Haiku 5.5) via `boto3` |
| Database | Supabase (PostgreSQL 15 + Auth + Realtime + PostgREST + Studio) |
| Workflows | Temporal (Python SDK) — data ingestion, AI orchestration, alerts |
| Frontend | Vite + React 18 + TanStack Router/Query + Tailwind CSS 4 + Radix UI |
| Infrastructure | Docker Compose, Helm charts, GitHub Actions CI/CD |

## Prerequisites

- Docker Desktop with Compose v2
- `make` (comes with macOS/Linux; install via Xcode CLT on macOS)
- **Supabase CLI** — `make up` runs `supabase start` to launch the local Supabase stack
- Node 18+
- Python 3.11+
- AWS account with Bedrock access (Claude models enabled in `eu-west-1`)

## Quick Start

1. Clone and copy environment defaults:
   ```bash
   git clone https://github.com/Bregza1309/forex-agentic-ai.git
   cd forex-agentic-ai
   cp .env.example .env
   ```

2. Add your API keys to `.env`:
   - `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (for Bedrock)
   - `ALPHA_VANTAGE_API_KEY` (free at [alphavantage.co](https://www.alphavantage.co/support/#api-key))
   - `FRED_API_KEY` (free at [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html))
   - `NEWS_API_KEY` (free at [newsapi.org](https://newsapi.org/register))

3. Start everything:
   ```bash
   make up
   ```
   Add `USE_DEV=1` for live-reload mounts: `USE_DEV=1 make up`

4. Open services:
   - **Frontend:** http://localhost:3000
   - **Temporal UI:** http://localhost:8080
   - **Supabase Studio:** http://localhost:54323
   - **Supabase API:** http://localhost:54321

## Architecture

```
Frontend (React)  ──►  Supabase (API + Auth + Realtime)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Temporal Workers   Edge Functions   PostgreSQL
        (Python + boto3)   (Deno proxies)   (Entity model)
              │
     ┌────────┼────────┐
     ▼        ▼        ▼
  Claude    Free API   Sentiment
  Bedrock   Sources    Sources
```

All Claude Bedrock calls route through Temporal Python workers (where `boto3` runs natively with retry/timeout guarantees). Supabase Edge Functions act as lightweight API proxies that start Temporal workflows.

See [ADR-001](docs/adrs/ADR-001-forex-agentic-ai-architecture.md) for full architecture rationale.

## Free Data Sources

| Source | Data | Free Tier |
|--------|------|-----------|
| Yahoo Finance (`yfinance`) | Historical forex OHLC | Unlimited (unofficial) |
| Alpha Vantage | Forex intraday/daily | 25 req/day |
| ECB / Frankfurter | EUR reference rates | Unlimited |
| FRED API | Economic indicators | 120 req/min |
| Open Exchange Rates | 170+ currencies | 1,000 req/month |
| News API | Financial headlines | 100 req/day |
| Reddit API | r/forex sentiment | 100 req/min |
| TradingView Widgets | Embeddable charts | Free (non-commercial) |

See [Free Data Sources Reference](docs/specs/forex-free-data-sources.md) for full details, sample code, and integration plans.

## Project Structure

```
forex-agentic-ai/
├── docs/
│   ├── adrs/                  # Architecture Decision Records
│   ├── specs/                 # Feature specs and data source reference
│   ├── architecture/          # System design diagrams
│   └── user-guide/            # End-user documentation
├── frontend/                  # Vite + React + TanStack app
│   └── src/
│       ├── components/        # Radix UI + custom components
│       ├── engine/            # JSON-driven UI engine
│       ├── pages/             # JSON page definitions
│       └── data/              # Supabase client + query builder
├── temporal/                  # Python Temporal worker
│   └── src/
│       ├── activities/        # Workflow activities (API calls, DB ops)
│       ├── workflows/         # Workflow definitions (ingestion, chat, alerts)
│       └── models/            # Pydantic models
├── supabase/
│   ├── config.toml            # Supabase CLI configuration
│   ├── migrations/            # Timestamped SQL migrations
│   └── seed.sql               # Seed data (currencies, fact types, etc.)
├── docker-compose.yml         # Full stack orchestration
├── docker-compose.dev.yml     # Dev overrides (live-reload)
├── Makefile                   # Lifecycle commands
└── .env.example               # Environment variable template
```

## Documentation

- [Feature Specification](docs/specs/forex-agentic-ai.md) — Goals, user stories, data model, implementation plan
- [Architecture Decision Record](docs/adrs/ADR-001-forex-agentic-ai-architecture.md) — Tech stack choices and rationale
- [Free Data Sources Reference](docs/specs/forex-free-data-sources.md) — API details, limits, sample code
- [Database Guide](DATABASE.md) — Core entity model and SCD2 conventions
- [Schema Guide](Guide_for_agents_using_supabase_template.md) — How to use entities, facts, time series, dimensions
- [Generalisable Schema](Generalisable_schema.md) — Schema specification for analytics tables

## Development

| Command | Description |
|---------|-------------|
| `make up` | Start full stack (Supabase + Temporal + frontend) |
| `USE_DEV=1 make up` | Start with live-reload mounts |
| `make down` | Stop all containers and Supabase |
| `make reset` | Tear down volumes, recreate from scratch |
| `make logs` | Stream all service logs |
| `make logs-temporal` | Stream Temporal worker logs |
| `make logs-frontend` | Stream frontend dev server logs |
| `make supabase-status` | Show Supabase URLs and local keys |
| `supabase db reset` | Reapply migrations + seed data |

## License

MIT
