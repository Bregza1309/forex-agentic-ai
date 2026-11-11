# Repository Guidelines — Forex Agentic AI

## Project Overview
This is a **Forex Agentic AI Personal Assistant** — a Claude Bedrock-powered trading assistant for beginners and experienced traders. It combines conversational AI, market data ingestion, technical analysis, sentiment scoring, and paper trading into a single full-stack application.

## Project Structure & Module Organization
- Docs live at the repo root (`README.md`, `Guide_for_agents_using_supabase_template.md`, `DATABASE.md`, `Generalisable_schema.md`) and are the fastest way to understand the schema and roadmap. Project documentation lives under `docs/` (architecture, ADRs, specs, user guides); reusable fill-in doc templates live under `docs/_templates/`.
- Supabase assets sit in `supabase/`: `config.toml` (CLI config), `migrations/*.sql` (ordered by timestamp), and `seed.sql` (loads after migrations).
- Application code is checked in: `frontend/` (Vite + React + TanStack, JSON-driven UI engine under `src/engine/`) and `temporal/` (Python Temporal worker under `src/`).
- Migrations follow a modular pattern (`core` model first, `analytics` next, then `forex_*` domain tables). Keep new domain-specific tables in new migration files rather than editing shipped ones.

## Build, Test, and Development Commands
- `supabase start` — Launch local Supabase stack (Postgres, Studio, API, Realtime) using `supabase/config.toml`. Requires Docker and the Supabase CLI.
- `supabase db reset --config supabase/config.toml` — Recreate the local database, apply all migrations in order, then run `seed.sql`. Run before opening a PR to ensure migrations stay green.
- Full stack (Supabase stub + Temporal + frontend) — use the Makefile wrappers: `make up` to start (`USE_DEV=1 make up` for live-reload), `make down` to stop, `make reset` to tear down volumes and recreate. These wrap `docker compose -f docker-compose.yml` (plus `docker-compose.dev.yml` when `USE_DEV=1`).

## Forex-Specific Architecture Notes

### Temporal Workflows
All Claude Bedrock calls route through the Temporal Python worker (not Supabase Edge Functions) because `boto3` requires a Python runtime, and Temporal provides retry/timeout guarantees for LLM calls. Key workflows:

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| `PriceIngestionWorkflow` | Every 15 min | Fetch forex prices via `yfinance` (batch) + Alpha Vantage (select intraday within 25 req/day) |
| `EconomicDataWorkflow` | Every 1 hour | Pull indicators from FRED and ECB/Frankfurter |
| `SentimentIngestionWorkflow` | Every 1 hour | News API + Reddit sentiment scoring |
| `TechnicalIndicatorWorkflow` | Every 15 min | Compute RSI, MACD, SMA from price time series |
| `AlertEvaluationWorkflow` | Every 5 min | Evaluate user alert rules against latest facts |
| `PortfolioSnapshotWorkflow` | Daily 00:00 UTC | Snapshot paper portfolio values |
| `ChatWorkflow` | On demand | Claude Bedrock agentic chat loop (tool-use cycle) |
| `RecommendWorkflow` | On demand | AI currency pair recommendations |
| `AnalyzeWorkflow` | On demand | AI market analysis narratives |

### Data Model (Entity Types)
The forex domain maps onto the template's entity-graph model:
- `currency` — individual currencies (EUR, USD, GBP)
- `currency_pair` — tradeable pairs (EUR/USD)
- `user_profile` — extended user profile linked to Supabase Auth
- `watchlist` — user's watched currency pairs
- `portfolio` — paper trading portfolio
- `trade` — individual simulated trade entries
- `alert` — price/indicator alert rules
- `learning_module` — educational content units

### Data Source Rate Limits
Temporal workflows stagger requests across free-tier APIs. When adding new data source integrations:
- Always respect rate limits — check `docs/specs/forex-free-data-sources.md` for current quotas
- Use `yfinance` as the primary batch price fetcher (no official rate limit)
- Alpha Vantage: 25 req/day only — reserve for select intraday pairs
- ECB/Frankfurter: unlimited — use for daily EUR reference rates
- FRED: 120 req/min — generous, but batch requests where possible

## Coding Style & Naming Conventions
- SQL uses snake_case with UUID primary keys (`default gen_random_uuid()`), timestamp columns `created_at`/`updated_at`, and booleans like `is_current` for SCD2 status.
- Prefer `jsonb` for flexible payloads (`entity_versions.data`, `time_series_points.data`); use numeric facts in `entity_facts` with clear `fact_type` references.
- Migration files are timestamped `YYYYMMDDHHMMSS_description.sql`; keep them idempotent where practical (`create table if not exists`) and group related changes together.
- Python code in `temporal/` uses Pydantic models for all data structures; snake_case functions; type hints required.

## Testing Guidelines
- There is no automated test suite yet; rely on the Supabase CLI for safety checks. Run `supabase db reset --config supabase/config.toml` to verify migrations and seeds apply cleanly.
- For manual QA, start the stack (`supabase start`), connect via `psql` or Supabase Studio, and spot-check new tables/functions before committing.
- Temporal workflows can be tested by starting the stack and triggering workflows via the Temporal UI at http://localhost:8080.

## Logging Guidelines
- **One-line rule:** All log messages should be formatted as single-line entries rather than spanning multiple lines. This ensures grep efficiency and makes log parsing easier.
- If a `docs/Logging.md` file exists in this repository, follow those formatting and conventions instead of the one-line rule above.
- Single-line logs improve searchability, enable efficient filtering with standard Unix tools, and simplify automated log analysis.

## Commit & Pull Request Guidelines
- Git history favors short, imperative subjects (e.g., "Add price ingestion workflow", "Create forex dimension tables") with the occasional `feat:` prefix. Keep subjects ≤72 characters; add context in the body when needed.
- In PR descriptions, include: purpose, summary of schema changes (tables, columns, constraints), migration file names, seed data impact, and any follow-up tasks. Link issues if applicable; screenshots are only needed when UI changes are involved.

## Security & Configuration Tips
- Do not commit secrets (AWS keys, API keys, JWT signing keys, etc.). Use environment variables in `.env` (git-ignored) and reference them in `docker-compose.yml`.
- Keep production and local configs separate; avoid hard-coding URLs or credentials inside migration files or seeds.
- All AI-generated content (recommendations, analysis) must include disclaimers — this is advisory only, not financial advice.
