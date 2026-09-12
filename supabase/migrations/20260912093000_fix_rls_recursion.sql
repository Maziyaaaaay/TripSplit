-- Fixes a bug in the previous migration: the "members can read their trip's
-- roster" policy queried the members table from inside its own policy on
-- members, which Postgres rejects outright as recursive RLS ("infinite
-- recursion detected in policy for relation members") — this broke reads on
-- BOTH tables entirely, not just closed the enumeration hole.
--
-- Fix: do the membership check inside a security-definer function, which
-- bypasses RLS for its own internal query and so never re-triggers the
-- policy that's calling it.

create or replace function is_trip_member(p_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from members m
    where m.trip_id = p_trip_id and m.auth_uid = auth.uid()
  );
$$;

grant execute on function is_trip_member(uuid) to authenticated;

drop policy if exists "members can read their own trip" on trips;
create policy "members can read their own trip"
  on trips for select
  to authenticated
  using (is_trip_member(trips.id));

drop policy if exists "members can read their trip's roster" on members;
create policy "members can read their trip's roster"
  on members for select
  to authenticated
  using (is_trip_member(members.trip_id));
