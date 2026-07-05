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
  family text,
  explanation_clarity int,
  instructions_quality int,
  voice_delivery_quality int,
  comment text,
  better_fit text,
  client_timestamp timestamptz
);

-- Migration for existing installs: add the feedback columns introduced later.
-- Safe to run repeatedly thanks to "if not exists".
alter table public.session_feedback
  add column if not exists family text,
  add column if not exists explanation_clarity int,
  add column if not exists instructions_quality int,
  add column if not exists voice_delivery_quality int,
  add column if not exists comment text,
  add column if not exists better_fit text;

-- The app talks to this table only through the serverless functions using the
-- service role key, so Row Level Security can stay enabled with no public
-- policies (service role bypasses RLS).
alter table public.session_feedback enable row level security;

-- Grant full access to service_role so the serverless functions can read/write.
grant all on public.session_feedback to service_role;
-- Allow the sequence (for id generation) to be used by service_role.
grant usage, select on all sequences in schema public to service_role;

-- Chat-Guide: rohe Transkripte (Audit, Eval, Prompt-Iteration) und
-- destillierte Profil-Notizen (gehen in den Kontext künftiger Gespräche).
-- Siehe docs/chat-guide-konzept.md, Abschnitt "Transkripte & Nutzer-Profil".
create table if not exists public.chat_transcripts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  device_id text,
  messages jsonb not null default '[]'::jsonb,
  mood_ids jsonb not null default '[]'::jsonb,
  state_goal text,
  recommended_id text,
  crisis boolean not null default false
);

create table if not exists public.user_profile_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  device_id text not null,
  note text not null
);
create index if not exists user_profile_notes_device_idx
  on public.user_profile_notes (device_id);

alter table public.chat_transcripts enable row level security;
alter table public.user_profile_notes enable row level security;
grant all on public.chat_transcripts to service_role;
grant all on public.user_profile_notes to service_role;
