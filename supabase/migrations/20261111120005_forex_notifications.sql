-- Notifications table for alert triggers and system messages
-- Referenced by the alerts-webhook edge function and AlertEvaluationWorkflow

create table if not exists notifications (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null,
    type        text not null,          -- 'alert_triggered', 'system', 'recommendation'
    title       text not null,
    body        text,
    metadata    jsonb not null default '{}'::jsonb,
    is_read     boolean not null default false,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create trigger trg_notifications_updated_at
    before update on notifications
    for each row
    execute function update_updated_at();

create index idx_notifications_user_id_created
    on notifications (user_id, created_at desc);

create index idx_notifications_user_id_unread
    on notifications (user_id)
    where is_read = false;

-- RLS
alter table notifications enable row level security;

create policy "Users can read own notifications"
    on notifications for select
    using (user_id = auth.uid());

create policy "Service role can insert notifications"
    on notifications for insert
    with check (true);

create policy "Users can mark own notifications as read"
    on notifications for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
