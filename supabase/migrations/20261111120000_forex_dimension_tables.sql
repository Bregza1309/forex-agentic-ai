-- Forex Agentic AI: Dimension tables
-- Created: 2026-11-11
-- Purpose: 7 dimension tables for forex domain (currencies, risk levels, trade signals, etc.)

-- dim_currency: individual currency metadata
create table if not exists dim_currency (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label       text not null,
  symbol      text,
  country     text,
  is_major    boolean not null default false,
  sort_order  int,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_dim_currency_updated_at
  before update on dim_currency
  for each row execute function update_updated_at();

-- dim_risk_level: risk classification for users and trades
create table if not exists dim_risk_level (
  id               uuid primary key default gen_random_uuid(),
  key              text not null unique,
  label            text not null,
  max_leverage     numeric,
  max_position_pct numeric,
  description      text,
  sort_order       int,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger trg_dim_risk_level_updated_at
  before update on dim_risk_level
  for each row execute function update_updated_at();

-- dim_trade_status: paper trade lifecycle states
create table if not exists dim_trade_status (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  label      text not null,
  sort_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_dim_trade_status_updated_at
  before update on dim_trade_status
  for each row execute function update_updated_at();

-- dim_alert_type: alert rule categories
create table if not exists dim_alert_type (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label       text not null,
  description text,
  sort_order  int,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_dim_alert_type_updated_at
  before update on dim_alert_type
  for each row execute function update_updated_at();

-- dim_learning_level: learning path difficulty levels
create table if not exists dim_learning_level (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label       text not null,
  sort_order  int,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_dim_learning_level_updated_at
  before update on dim_learning_level
  for each row execute function update_updated_at();

-- dim_trade_signal: AI recommendation signal types
create table if not exists dim_trade_signal (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label       text not null,
  sort_order  int,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_dim_trade_signal_updated_at
  before update on dim_trade_signal
  for each row execute function update_updated_at();

-- dim_indicator_type: technical indicator classification
create table if not exists dim_indicator_type (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label       text not null,
  description text,
  sort_order  int,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_dim_indicator_type_updated_at
  before update on dim_indicator_type
  for each row execute function update_updated_at();
