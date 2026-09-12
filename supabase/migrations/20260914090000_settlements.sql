-- Phase 4: settlements — "mark a debt settled" against the derived balances.
--
-- Same pattern as expenses: writes go through security-definer RPCs rather
-- than direct table policies, since marking/unmarking needs cross-row
-- validation (both members belong to this trip, only the person who marked
-- it can undo it) that plain RLS can't express as cleanly.

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  from_member_id uuid not null references members(id),
  to_member_id uuid not null references members(id),
  amount numeric(12,2) not null check (amount > 0),
  method text not null default 'manual',
  marked_settled_at timestamptz not null default now(),
  marked_by uuid not null references members(id)
);

alter table settlements enable row level security;

create policy "members can read their trip's settlements"
  on settlements for select
  to authenticated
  using (is_trip_member(trip_id));

create or replace function mark_settled(
  p_trip_id uuid,
  p_from_member_id uuid,
  p_to_member_id uuid,
  p_amount numeric
)
returns settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := get_my_member_id(p_trip_id);
  v_settlement settlements;
begin
  if v_me is null then
    raise exception 'not a member of this trip';
  end if;

  if p_from_member_id = p_to_member_id then
    raise exception 'cannot settle with yourself';
  end if;

  if not exists (select 1 from members m where m.id = p_from_member_id and m.trip_id = p_trip_id) then
    raise exception 'from member is not part of this trip';
  end if;

  if not exists (select 1 from members m where m.id = p_to_member_id and m.trip_id = p_trip_id) then
    raise exception 'to member is not part of this trip';
  end if;

  insert into settlements (trip_id, from_member_id, to_member_id, amount, marked_by)
  values (p_trip_id, p_from_member_id, p_to_member_id, p_amount, v_me)
  returning * into v_settlement;

  return v_settlement;
end;
$$;

grant execute on function mark_settled(uuid, uuid, uuid, numeric) to authenticated;

create or replace function unmark_settled(p_settlement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_marked_by uuid;
  v_me uuid;
begin
  select trip_id, marked_by into v_trip_id, v_marked_by from settlements where id = p_settlement_id;
  if v_trip_id is null then
    raise exception 'settlement not found';
  end if;

  v_me := get_my_member_id(v_trip_id);
  if v_me is null or v_me <> v_marked_by then
    raise exception 'only the person who marked this settled can undo it';
  end if;

  delete from settlements where id = p_settlement_id;
end;
$$;

grant execute on function unmark_settled(uuid) to authenticated;

alter publication supabase_realtime add table settlements;
