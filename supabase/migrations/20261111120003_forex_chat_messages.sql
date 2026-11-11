-- Forex Agentic AI: Chat messages table
-- Created: 2026-11-11
-- Purpose: dedicated table for AI conversation history (not stored in time_series_points)

create table if not exists chat_messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  conversation_id uuid not null,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  model           text,
  tokens_used     int,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_chat_messages_user_conversation
  on chat_messages (user_id, conversation_id, created_at);

create index if not exists idx_chat_messages_conversation
  on chat_messages (conversation_id, created_at);
