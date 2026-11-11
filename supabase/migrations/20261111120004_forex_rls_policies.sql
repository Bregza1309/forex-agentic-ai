-- Forex Agentic AI: Row-Level Security policies
-- Created: 2026-11-11
-- Purpose: enable RLS on all tables with appropriate access policies

-- ============================================================
-- 1. Enable RLS on all tables
-- ============================================================

alter table entities enable row level security;
alter table entity_versions enable row level security;
alter table relationships_v2 enable row level security;
alter table fact_types enable row level security;
alter table entity_facts enable row level security;
alter table time_series_points enable row level security;
alter table chat_messages enable row level security;
alter table dim_currency enable row level security;
alter table dim_risk_level enable row level security;
alter table dim_trade_status enable row level security;
alter table dim_alert_type enable row level security;
alter table dim_learning_level enable row level security;
alter table dim_trade_signal enable row level security;
alter table dim_indicator_type enable row level security;

-- ============================================================
-- 2. Dimension tables: public read, service_role write
-- ============================================================

-- dim_currency
create policy "dim_currency_select" on dim_currency
  for select to authenticated using (true);
create policy "dim_currency_manage" on dim_currency
  for all to service_role using (true) with check (true);

-- dim_risk_level
create policy "dim_risk_level_select" on dim_risk_level
  for select to authenticated using (true);
create policy "dim_risk_level_manage" on dim_risk_level
  for all to service_role using (true) with check (true);

-- dim_trade_status
create policy "dim_trade_status_select" on dim_trade_status
  for select to authenticated using (true);
create policy "dim_trade_status_manage" on dim_trade_status
  for all to service_role using (true) with check (true);

-- dim_alert_type
create policy "dim_alert_type_select" on dim_alert_type
  for select to authenticated using (true);
create policy "dim_alert_type_manage" on dim_alert_type
  for all to service_role using (true) with check (true);

-- dim_learning_level
create policy "dim_learning_level_select" on dim_learning_level
  for select to authenticated using (true);
create policy "dim_learning_level_manage" on dim_learning_level
  for all to service_role using (true) with check (true);

-- dim_trade_signal
create policy "dim_trade_signal_select" on dim_trade_signal
  for select to authenticated using (true);
create policy "dim_trade_signal_manage" on dim_trade_signal
  for all to service_role using (true) with check (true);

-- dim_indicator_type
create policy "dim_indicator_type_select" on dim_indicator_type
  for select to authenticated using (true);
create policy "dim_indicator_type_manage" on dim_indicator_type
  for all to service_role using (true) with check (true);

-- ============================================================
-- 3. fact_types: public read for authenticated
-- ============================================================

create policy "fact_types_select" on fact_types
  for select to authenticated using (true);
create policy "fact_types_manage" on fact_types
  for all to service_role using (true) with check (true);

-- ============================================================
-- 4. entities: public entity types readable by all authenticated,
--    user-owned entity types restricted to owner
-- ============================================================

-- Public entity types (currency_pair, currency, learning_module) are readable by everyone
create policy "entities_public_select" on entities
  for select to authenticated
  using (entity_type in ('currency_pair', 'currency', 'learning_module'));

-- User-owned entities: user_profile is keyed by source_record_id = auth.uid()
create policy "entities_user_profile_select" on entities
  for select to authenticated
  using (
    entity_type = 'user_profile'
    and source_record_id = auth.uid()::text
  );

create policy "entities_user_profile_insert" on entities
  for insert to authenticated
  with check (
    entity_type = 'user_profile'
    and source_record_id = auth.uid()::text
  );

create policy "entities_user_profile_update" on entities
  for update to authenticated
  using (
    entity_type = 'user_profile'
    and source_record_id = auth.uid()::text
  )
  with check (
    entity_type = 'user_profile'
    and source_record_id = auth.uid()::text
  );

-- User-owned child entities (portfolio, trade, alert, watchlist):
-- accessible if the user owns the parent via a relationship chain
create policy "entities_user_owned_select" on entities
  for select to authenticated
  using (
    entity_type in ('portfolio', 'trade', 'alert', 'watchlist')
    and exists (
      select 1 from relationships_v2 r
      join entities parent on parent.id = r.parent_id
      where r.child_id = entities.id
        and r.is_current = true
        and (
          (parent.entity_type = 'user_profile' and parent.source_record_id = auth.uid()::text)
          or exists (
            select 1 from relationships_v2 r2
            join entities grandparent on grandparent.id = r2.parent_id
            where r2.child_id = parent.id
              and r2.is_current = true
              and grandparent.entity_type = 'user_profile'
              and grandparent.source_record_id = auth.uid()::text
          )
        )
    )
  );

create policy "entities_user_owned_insert" on entities
  for insert to authenticated
  with check (
    entity_type in ('portfolio', 'trade', 'alert', 'watchlist')
  );

create policy "entities_user_owned_update" on entities
  for update to authenticated
  using (
    entity_type in ('portfolio', 'trade', 'alert', 'watchlist')
    and exists (
      select 1 from relationships_v2 r
      join entities parent on parent.id = r.parent_id
      where r.child_id = entities.id
        and r.is_current = true
        and (
          (parent.entity_type = 'user_profile' and parent.source_record_id = auth.uid()::text)
          or exists (
            select 1 from relationships_v2 r2
            join entities grandparent on grandparent.id = r2.parent_id
            where r2.child_id = parent.id
              and r2.is_current = true
              and grandparent.entity_type = 'user_profile'
              and grandparent.source_record_id = auth.uid()::text
          )
        )
    )
  );

create policy "entities_user_owned_delete" on entities
  for delete to authenticated
  using (
    entity_type in ('portfolio', 'trade', 'alert', 'watchlist')
    and exists (
      select 1 from relationships_v2 r
      join entities parent on parent.id = r.parent_id
      where r.child_id = entities.id
        and r.is_current = true
        and (
          (parent.entity_type = 'user_profile' and parent.source_record_id = auth.uid()::text)
          or exists (
            select 1 from relationships_v2 r2
            join entities grandparent on grandparent.id = r2.parent_id
            where r2.child_id = parent.id
              and r2.is_current = true
              and grandparent.entity_type = 'user_profile'
              and grandparent.source_record_id = auth.uid()::text
          )
        )
    )
  );

-- Service role can manage all entities
create policy "entities_service_manage" on entities
  for all to service_role using (true) with check (true);

-- ============================================================
-- 5. entity_versions: follow parent entity access
-- ============================================================

create policy "entity_versions_public_select" on entity_versions
  for select to authenticated
  using (
    exists (
      select 1 from entities e
      where e.id = entity_versions.entity_id
        and e.entity_type in ('currency_pair', 'currency', 'learning_module')
    )
  );

create policy "entity_versions_user_select" on entity_versions
  for select to authenticated
  using (
    exists (
      select 1 from entities e
      where e.id = entity_versions.entity_id
        and e.entity_type in ('user_profile', 'portfolio', 'trade', 'alert', 'watchlist')
        and (
          (e.entity_type = 'user_profile' and e.source_record_id = auth.uid()::text)
          or exists (
            select 1 from relationships_v2 r
            join entities parent on parent.id = r.parent_id
            where r.child_id = e.id
              and r.is_current = true
              and (
                (parent.entity_type = 'user_profile' and parent.source_record_id = auth.uid()::text)
                or exists (
                  select 1 from relationships_v2 r2
                  join entities gp on gp.id = r2.parent_id
                  where r2.child_id = parent.id
                    and r2.is_current = true
                    and gp.entity_type = 'user_profile'
                    and gp.source_record_id = auth.uid()::text
                )
              )
          )
        )
    )
  );

create policy "entity_versions_insert" on entity_versions
  for insert to authenticated
  with check (
    exists (
      select 1 from entities e
      where e.id = entity_versions.entity_id
        and (
          (e.entity_type = 'user_profile' and e.source_record_id = auth.uid()::text)
          or e.entity_type in ('portfolio', 'trade', 'alert', 'watchlist')
        )
    )
  );

create policy "entity_versions_service_manage" on entity_versions
  for all to service_role using (true) with check (true);

-- ============================================================
-- 6. relationships_v2: follow parent entity access
-- ============================================================

create policy "relationships_public_select" on relationships_v2
  for select to authenticated
  using (
    exists (
      select 1 from entities e
      where e.id = relationships_v2.parent_id
        and e.entity_type in ('currency_pair', 'currency', 'learning_module')
    )
  );

create policy "relationships_user_select" on relationships_v2
  for select to authenticated
  using (
    exists (
      select 1 from entities e
      where e.id = relationships_v2.parent_id
        and e.entity_type = 'user_profile'
        and e.source_record_id = auth.uid()::text
    )
    or exists (
      select 1 from relationships_v2 r
      join entities parent on parent.id = r.parent_id
      where r.child_id = relationships_v2.parent_id
        and r.is_current = true
        and parent.entity_type = 'user_profile'
        and parent.source_record_id = auth.uid()::text
    )
  );

create policy "relationships_user_insert" on relationships_v2
  for insert to authenticated
  with check (
    exists (
      select 1 from entities e
      where e.id = relationships_v2.parent_id
        and (
          (e.entity_type = 'user_profile' and e.source_record_id = auth.uid()::text)
          or e.entity_type in ('portfolio', 'watchlist')
        )
    )
  );

create policy "relationships_service_manage" on relationships_v2
  for all to service_role using (true) with check (true);

-- ============================================================
-- 7. entity_facts: public pairs readable, user entities restricted
-- ============================================================

create policy "entity_facts_public_select" on entity_facts
  for select to authenticated
  using (
    exists (
      select 1 from entities e
      where e.id = entity_facts.entity_id
        and e.entity_type in ('currency_pair', 'currency')
    )
  );

create policy "entity_facts_user_select" on entity_facts
  for select to authenticated
  using (
    exists (
      select 1 from entities e
      where e.id = entity_facts.entity_id
        and e.entity_type in ('portfolio', 'user_profile')
        and (
          (e.source_record_id = auth.uid()::text)
          or exists (
            select 1 from relationships_v2 r
            join entities parent on parent.id = r.parent_id
            where r.child_id = e.id
              and r.is_current = true
              and parent.entity_type = 'user_profile'
              and parent.source_record_id = auth.uid()::text
          )
        )
    )
  );

create policy "entity_facts_service_manage" on entity_facts
  for all to service_role using (true) with check (true);

-- ============================================================
-- 8. time_series_points: same pattern as entity_facts
-- ============================================================

create policy "time_series_public_select" on time_series_points
  for select to authenticated
  using (
    exists (
      select 1 from entities e
      where e.id = time_series_points.entity_id
        and e.entity_type in ('currency_pair', 'currency')
    )
  );

create policy "time_series_user_select" on time_series_points
  for select to authenticated
  using (
    exists (
      select 1 from entities e
      where e.id = time_series_points.entity_id
        and e.entity_type in ('portfolio', 'user_profile')
        and (
          (e.source_record_id = auth.uid()::text)
          or exists (
            select 1 from relationships_v2 r
            join entities parent on parent.id = r.parent_id
            where r.child_id = e.id
              and r.is_current = true
              and parent.entity_type = 'user_profile'
              and parent.source_record_id = auth.uid()::text
          )
        )
    )
  );

create policy "time_series_service_manage" on time_series_points
  for all to service_role using (true) with check (true);

-- ============================================================
-- 9. chat_messages: user can only access their own messages
-- ============================================================

create policy "chat_messages_select" on chat_messages
  for select to authenticated
  using (user_id = auth.uid());

create policy "chat_messages_insert" on chat_messages
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "chat_messages_service_manage" on chat_messages
  for all to service_role using (true) with check (true);
