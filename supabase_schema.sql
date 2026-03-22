-- ─────────────────────────────────────────────────────────────
-- FitTrack AI — Supabase Schema
-- Run this in: Supabase dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────

-- ── 1. profiles table ─────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text,
  display_name   text,
  photo_url      text,
  setup_done     boolean default false,
  goal           text,
  activity_level text,
  age            text,
  weight         text,
  height         text,
  sex            text default 'male',
  step_goal      integer default 8000,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ── 2. days table (one row per user per calendar day) ─────────
create table if not exists public.days (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profiles(id) on delete cascade,
  date       date not null,
  payload    jsonb not null default '{}',
  updated_at timestamptz default now(),
  unique (user_id, date)
);

-- ── 3. Row Level Security — users only see their own data ──────
alter table public.profiles enable row level security;
alter table public.days     enable row level security;

-- profiles: own row only
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id);

-- days: own rows only
create policy "days: own rows" on public.days
  for all using (auth.uid() = user_id);

-- ── 4. Index for fast day lookups ─────────────────────────────
create index if not exists days_user_date on public.days (user_id, date desc);
