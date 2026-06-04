-- Supabase schema for collecting team feedback.
-- Run this in the Supabase SQL editor.

create table if not exists public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  practice_id text not null,
  selected_mood_ids jsonb not null default '[]'::jsonb,
  profile jsonb not null default '{}'::jsonb,
  state_goal text,
  long_term_goals jsonb not null default '[]'::jsonb,
  rating int,
  client_timestamp timestamptz
);

-- The app talks to this table only through the serverless functions using the
-- service role key, so Row Level Security can stay enabled with no public
-- policies (service role bypasses RLS).
alter table public.session_feedback enable row level security;
