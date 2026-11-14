-- ═══════════════════════════════════════════════════════════════════════════
-- FitPlanner — Web Push (powiadomienie o końcu przerwy)
--
-- Uruchom w SQL Editorze Supabase (Dashboard → SQL Editor) albo:
--   psql "$SUPABASE_DB_URL" -f SUPABASE_SETUP_PUSH.sql
--
-- Tabele:
--   push_subscriptions — subskrypcje Web Push (jedna na urządzenie)
--   push_schedules    — harmonogramy powiadomień (krótkie, kasowane po godzinie)
--
-- Dostęp do tych tabel ma TYLKO Edge Function (klucz service_role).
-- Zwykły użytkownik widzi swoje wiersze, a cudze nie — na wypadek, gdyby
-- kiedyś pojawił się klient SQL w przeglądarce.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Subskrypcje ───────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- ── Harmonogramy powiadomień ──────────────────────────────────────────────
create table if not exists public.push_schedules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  ends_at     timestamptz not null,
  title       text not null default 'Czas!',
  body        text not null default 'Przerwa minęła — możesz zacząć kolejną serię.',
  cancelled   boolean not null default false,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists push_schedules_user_id_idx
  on public.push_schedules (user_id);

alter table public.push_schedules enable row level security;

drop policy if exists "push_schedules_select_own" on public.push_schedules;
create policy "push_schedules_select_own" on public.push_schedules
  for select using (auth.uid() = user_id);

drop policy if exists "push_schedules_update_own" on public.push_schedules;
create policy "push_schedules_update_own" on public.push_schedules
  for update using (auth.uid() = user_id);

drop policy if exists "push_schedules_delete_own" on public.push_schedules;
create policy "push_schedules_delete_own" on public.push_schedules
  for delete using (auth.uid() = user_id);

-- ── Sprzątanie starych harmonogramów (opcjonalne, raz na godzinę) ───────
-- Jeśli w projekcie jest włączony pg_cron:
--
--   select cron.schedule(
--     'fitplanner-push-cleanup',
--     '17 * * * *',
--     $$delete from public.push_schedules where created_at < now() - interval '2 hours'$$
--   );
