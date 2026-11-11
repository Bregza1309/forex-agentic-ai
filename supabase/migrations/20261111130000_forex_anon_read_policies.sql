-- Forex Agentic AI: Anon read policies for public market data
-- Created: 2026-11-11
-- Purpose: Allow unauthenticated (anon) users to read public market data
--          so the dashboard works before login.

-- 1. entities: anon can read public entity types
create policy "entities_anon_select" on entities
  for select to anon
  using (entity_type in ('currency_pair', 'currency', 'learning_module'));

-- 2. entity_versions: anon can read versions for public entities
create policy "entity_versions_anon_select" on entity_versions
  for select to anon
  using (
    exists (
      select 1 from entities e
      where e.id = entity_versions.entity_id
        and e.entity_type in ('currency_pair', 'currency', 'learning_module')
    )
  );

-- 3. fact_types: anon can read all fact type definitions
create policy "fact_types_anon_select" on fact_types
  for select to anon using (true);

-- 4. entity_facts: anon can read facts for public entities
create policy "entity_facts_anon_select" on entity_facts
  for select to anon
  using (
    exists (
      select 1 from entities e
      where e.id = entity_facts.entity_id
        and e.entity_type in ('currency_pair', 'currency')
    )
  );

-- 5. time_series_points: anon can read price history for public entities
create policy "time_series_anon_select" on time_series_points
  for select to anon
  using (
    exists (
      select 1 from entities e
      where e.id = time_series_points.entity_id
        and e.entity_type in ('currency_pair', 'currency')
    )
  );

-- 6. dimension tables: anon can read all
create policy "dim_currency_anon_select" on dim_currency
  for select to anon using (true);
create policy "dim_risk_level_anon_select" on dim_risk_level
  for select to anon using (true);
create policy "dim_trade_status_anon_select" on dim_trade_status
  for select to anon using (true);
create policy "dim_alert_type_anon_select" on dim_alert_type
  for select to anon using (true);
create policy "dim_learning_level_anon_select" on dim_learning_level
  for select to anon using (true);
create policy "dim_trade_signal_anon_select" on dim_trade_signal
  for select to anon using (true);
create policy "dim_indicator_type_anon_select" on dim_indicator_type
  for select to anon using (true);

-- 7. relationships_v2: anon can read relationships for public entities
create policy "relationships_anon_select" on relationships_v2
  for select to anon
  using (
    exists (
      select 1 from entities e
      where e.id = relationships_v2.parent_id
        and e.entity_type in ('currency_pair', 'currency', 'learning_module')
    )
  );
