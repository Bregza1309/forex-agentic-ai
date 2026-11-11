-- Forex Agentic AI: Fact type definitions
-- Created: 2026-11-11
-- Purpose: register all forex-specific metric and indicator types

insert into fact_types (key, label, description, unit)
values
  ('exchange_rate',  'Exchange Rate',    'Latest bid price for a currency pair',     'price'),
  ('spread',         'Spread',           'Current bid-ask spread',                   'pips'),
  ('volatility_14d', '14-Day Volatility','14-day historical volatility',             'percent'),
  ('rsi_14',         'RSI (14)',         '14-period Relative Strength Index',        'index'),
  ('macd_signal',    'MACD Signal',      'MACD histogram value',                     'numeric'),
  ('sma_50',         '50-Period SMA',    '50-period Simple Moving Average',          'price'),
  ('sma_200',        '200-Period SMA',   '200-period Simple Moving Average',         'price'),
  ('sentiment_score','Sentiment Score',  'Aggregated sentiment (-1 to +1)',          'score'),
  ('portfolio_pnl',  'Portfolio P&L',    'Cumulative profit/loss',                   'currency'),
  ('win_rate',       'Win Rate',         'Percentage of profitable trades',          'percent'),
  ('avg_risk_reward','Avg Risk:Reward',  'Average risk-to-reward ratio',             'ratio'),
  ('trade_count',    'Trade Count',      'Number of trades in portfolio',            'count')
on conflict (key) do nothing;
