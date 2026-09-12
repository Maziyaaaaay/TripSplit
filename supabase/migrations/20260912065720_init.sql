-- TripSplit — Phase 1 schema: trips + members
-- Applied manually via the Supabase SQL Editor for now (no CLI project link yet).

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  destination text,
  start_date date,
  end_date date,
  currency text not null default 'INR',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  display_name text not null,
  auth_uid uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (trip_id, auth_uid)
);

alter table trips enable row level security;
alter table members enable row level security;

-- Anonymous sign-in still issues a real Supabase auth session (role "authenticated").
-- Gating every policy on that role blocks a bare anon-key script from reading/writing
-- without ever going through the app's join flow — the trust boundary is "has a
-- session", not "has an account".

create policy "authenticated can read trips"
  on trips for select
  to authenticated
  using (true);

create policy "authenticated can create trips"
  on trips for insert
  to authenticated
  with check (true);

create policy "authenticated can read members"
  on members for select
  to authenticated
  using (true);

-- A member row can only be inserted for the caller's own session — nobody can
-- register someone else's identity via a crafted API call.
create policy "authenticated can join as self"
  on members for insert
  to authenticated
  with check (auth_uid = auth.uid());
