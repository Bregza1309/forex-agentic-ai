-- Forex Agentic AI: Seed data for dimensions, currency pairs, and relationships
-- Created: 2026-11-11
-- Purpose: populate dimension tables and create initial currency pair entities

-- ============================================================
-- 1. Seed dimension tables
-- ============================================================

-- dim_currency (8 majors)
insert into dim_currency (key, label, symbol, country, is_major, sort_order, description)
values
  ('usd', 'US Dollar',            '$',  'United States',  true, 1, 'World reserve currency'),
  ('eur', 'Euro',                 '€',  'Eurozone',       true, 2, 'Currency of the European Union'),
  ('gbp', 'British Pound',        '£',  'United Kingdom', true, 3, 'Sterling'),
  ('jpy', 'Japanese Yen',         '¥',  'Japan',          true, 4, 'Safe-haven currency'),
  ('chf', 'Swiss Franc',          'Fr', 'Switzerland',    true, 5, 'Safe-haven currency'),
  ('aud', 'Australian Dollar',    'A$', 'Australia',      true, 6, 'Commodity currency'),
  ('cad', 'Canadian Dollar',      'C$', 'Canada',         true, 7, 'Commodity currency, correlated with oil'),
  ('nzd', 'New Zealand Dollar',   'NZ$','New Zealand',    true, 8, 'Commodity currency')
on conflict (key) do nothing;

-- dim_risk_level
insert into dim_risk_level (key, label, max_leverage, max_position_pct, sort_order, description)
values
  ('conservative', 'Conservative', 5,  2,  1, 'Low risk tolerance — small positions, minimal leverage'),
  ('moderate',     'Moderate',     10, 5,  2, 'Balanced risk — moderate positions and leverage'),
  ('aggressive',   'Aggressive',   20, 10, 3, 'High risk tolerance — larger positions, higher leverage')
on conflict (key) do nothing;

-- dim_trade_status
insert into dim_trade_status (key, label, sort_order)
values
  ('open',          'Open',          1),
  ('closed_profit', 'Closed (Profit)', 2),
  ('closed_loss',   'Closed (Loss)', 3),
  ('cancelled',     'Cancelled',     4)
on conflict (key) do nothing;

-- dim_alert_type
insert into dim_alert_type (key, label, description, sort_order)
values
  ('price_cross_above', 'Price Crosses Above', 'Triggers when price crosses above threshold',          1),
  ('price_cross_below', 'Price Crosses Below', 'Triggers when price crosses below threshold',          2),
  ('rsi_overbought',    'RSI Overbought',      'Triggers when RSI exceeds overbought level (e.g. 70)', 3),
  ('rsi_oversold',      'RSI Oversold',        'Triggers when RSI falls below oversold level (e.g. 30)', 4),
  ('macd_crossover',    'MACD Crossover',      'Triggers on MACD line crossing signal line',           5),
  ('volatility_spike',  'Volatility Spike',    'Triggers when volatility exceeds threshold',           6)
on conflict (key) do nothing;

-- dim_learning_level
insert into dim_learning_level (key, label, sort_order, description)
values
  ('beginner',     'Beginner',     1, 'New to forex — covers fundamentals, terminology, and basic chart reading'),
  ('intermediate', 'Intermediate', 2, 'Familiar with basics — covers technical analysis, risk management, strategies'),
  ('advanced',     'Advanced',     3, 'Experienced trader — covers advanced strategies, macro analysis, psychology')
on conflict (key) do nothing;

-- dim_trade_signal
insert into dim_trade_signal (key, label, sort_order, description)
values
  ('strong_buy',  'Strong Buy',  1, 'Multiple indicators align bullish — high confidence long signal'),
  ('buy',         'Buy',         2, 'Moderate bullish signal'),
  ('neutral',     'Neutral',     3, 'No clear directional bias'),
  ('sell',        'Sell',        4, 'Moderate bearish signal'),
  ('strong_sell', 'Strong Sell', 5, 'Multiple indicators align bearish — high confidence short signal')
on conflict (key) do nothing;

-- dim_indicator_type
insert into dim_indicator_type (key, label, description, sort_order)
values
  ('momentum',   'Momentum',   'Measures speed of price changes (e.g. RSI, Stochastic)',        1),
  ('trend',      'Trend',      'Identifies direction of price movement (e.g. SMA, EMA)',        2),
  ('volatility', 'Volatility', 'Measures rate of price variation (e.g. ATR, Bollinger Bands)',  3),
  ('oscillator', 'Oscillator', 'Oscillates between bounds to signal overbought/oversold (e.g. MACD)', 4)
on conflict (key) do nothing;

-- ============================================================
-- 2. Seed individual currency entities
-- ============================================================

insert into entities (entity_type, source_record_id)
values
  ('currency', 'EUR'),
  ('currency', 'USD'),
  ('currency', 'GBP'),
  ('currency', 'JPY'),
  ('currency', 'CHF'),
  ('currency', 'AUD'),
  ('currency', 'CAD'),
  ('currency', 'NZD')
on conflict (entity_type, source_record_id) do nothing;

-- ============================================================
-- 3. Seed 8 major currency pair entities
-- ============================================================

insert into entities (entity_type, source_record_id)
values
  ('currency_pair', 'EURUSD'),
  ('currency_pair', 'GBPUSD'),
  ('currency_pair', 'USDJPY'),
  ('currency_pair', 'USDCHF'),
  ('currency_pair', 'AUDUSD'),
  ('currency_pair', 'USDCAD'),
  ('currency_pair', 'NZDUSD'),
  ('currency_pair', 'GBPJPY')
on conflict (entity_type, source_record_id) do nothing;

-- ============================================================
-- 4. Seed entity_versions for each pair (initial configuration)
-- ============================================================

insert into entity_versions (entity_id, version_number, data)
select e.id, 1, v.data
from entities e
join (values
  ('EURUSD', '{"base":"EUR","quote":"USD","pip_size":0.0001,"typical_spread":1.1,"description":"Euro vs US Dollar - most traded pair globally"}'::jsonb),
  ('GBPUSD', '{"base":"GBP","quote":"USD","pip_size":0.0001,"typical_spread":1.5,"description":"British Pound vs US Dollar - Cable"}'::jsonb),
  ('USDJPY', '{"base":"USD","quote":"JPY","pip_size":0.01,"typical_spread":1.2,"description":"US Dollar vs Japanese Yen - safe-haven cross"}'::jsonb),
  ('USDCHF', '{"base":"USD","quote":"CHF","pip_size":0.0001,"typical_spread":1.6,"description":"US Dollar vs Swiss Franc - Swissy"}'::jsonb),
  ('AUDUSD', '{"base":"AUD","quote":"USD","pip_size":0.0001,"typical_spread":1.4,"description":"Australian Dollar vs US Dollar - Aussie"}'::jsonb),
  ('USDCAD', '{"base":"USD","quote":"CAD","pip_size":0.0001,"typical_spread":1.8,"description":"US Dollar vs Canadian Dollar - Loonie"}'::jsonb),
  ('NZDUSD', '{"base":"NZD","quote":"USD","pip_size":0.0001,"typical_spread":1.8,"description":"New Zealand Dollar vs US Dollar - Kiwi"}'::jsonb),
  ('GBPJPY', '{"base":"GBP","quote":"JPY","pip_size":0.01,"typical_spread":2.5,"description":"British Pound vs Japanese Yen - volatile cross"}'::jsonb)
) as v(source_record_id, data) on e.source_record_id = v.source_record_id
where e.entity_type = 'currency_pair'
on conflict (entity_id, version_number) do nothing;

-- ============================================================
-- 5. Seed relationships: pair → base currency, pair → quote currency
-- ============================================================

-- pair_has_base_currency
insert into relationships_v2 (relationship_type, parent_id, child_id, metadata)
select
  'pair_has_base_currency',
  pair.id,
  base_cur.id,
  '{}'::jsonb
from entities pair
join entity_versions ev on ev.entity_id = pair.id and ev.is_current = true
join entities base_cur
  on base_cur.entity_type = 'currency'
  and base_cur.source_record_id = ev.data->>'base'
where pair.entity_type = 'currency_pair'
on conflict do nothing;

-- pair_has_quote_currency
insert into relationships_v2 (relationship_type, parent_id, child_id, metadata)
select
  'pair_has_quote_currency',
  pair.id,
  quote_cur.id,
  '{}'::jsonb
from entities pair
join entity_versions ev on ev.entity_id = pair.id and ev.is_current = true
join entities quote_cur
  on quote_cur.entity_type = 'currency'
  and quote_cur.source_record_id = ev.data->>'quote'
where pair.entity_type = 'currency_pair'
on conflict do nothing;
