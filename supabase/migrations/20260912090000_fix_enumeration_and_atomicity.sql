-- Fixes two real bugs found in review of the Phase 1 schema:
--
-- 1. RLS enumeration hole: "using (true)" on trips/members let ANY signed-in
--    session (anonymous sign-in is free and instant, no captcha) dump every
--    trip and every member's name via the raw REST API, completely bypassing
--    the "you need the link" trust model. Verified live against this project.
--
-- 2. Non-atomic trip creation: the app inserted the trip row and the
--    creator's member row as two separate requests. If the second failed,
--    the trip was left orphaned with zero members and no way to recover it.

drop policy if exists "authenticated can read trips" on trips;
drop policy if exists "authenticated can read members" on members;

-- You can only read a trip/roster you're already a member of.
create policy "members can read their own trip"
  on trips for select
  to authenticated
  using (
    exists (
      select 1 from members m
      where m.trip_id = trips.id and m.auth_uid = auth.uid()
    )
  );

create policy "members can read their trip's roster"
  on members for select
  to authenticated
  using (
    exists (
      select 1 from members m2
      where m2.trip_id = members.trip_id and m2.auth_uid = auth.uid()
    )
  );

-- The join screen still needs to show a preview (trip name, destination,
-- a few member names) to someone who ISN'T a member yet. These run as the
-- function owner (security definer) so they bypass the policies above —
-- but each only ever returns an exact match for a slug the caller already
-- had to know, never a scan, so they don't reopen the enumeration hole.
create or replace function get_trip_preview(p_slug text)
returns table (
  id uuid,
  slug text,
  name text,
  destination text,
  end_date date,
  member_count bigint
)
language sql
security definer
set search_path = public
as $$
  select t.id, t.slug, t.name, t.destination, t.end_date,
         (select count(*) from members m where m.trip_id = t.id) as member_count
  from trips t
  where t.slug = p_slug;
$$;

create or replace function get_trip_join_preview(p_slug text)
returns table (display_name text)
language sql
security definer
set search_path = public
as $$
  select m.display_name
  from members m
  join trips t on t.id = m.trip_id
  where t.slug = p_slug
  order by m.joined_at asc
  limit 3;
$$;

grant execute on function get_trip_preview(text) to authenticated;
grant execute on function get_trip_join_preview(text) to authenticated;

-- Atomic trip creation: insert the trip and the creator's own membership in
-- one transaction, so a mid-flight failure can never leave an orphaned trip.
create or replace function create_trip_with_creator(
  p_name text,
  p_destination text,
  p_currency text,
  p_slug text,
  p_creator_name text
)
returns trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip trips;
begin
  insert into trips (name, destination, currency, slug)
  values (p_name, p_destination, p_currency, p_slug)
  returning * into v_trip;

  insert into members (trip_id, display_name, auth_uid)
  values (v_trip.id, p_creator_name, auth.uid());

  return v_trip;
end;
$$;

grant execute on function create_trip_with_creator(text, text, text, text, text) to authenticated;
