-- Phase 7: leave a trip / remove a member. Serves both "leave" (caller
-- removes themselves) and "remove" (caller removes someone else) through
-- one RPC — the app layer decides which by passing its own member id or
-- another's.
--
-- A member can only be removed if they have no financial footprint on this
-- trip: not a payer or creator of any expense, not a split participant, and
-- not party to any settlement. expenses.payer_id/created_by,
-- expense_splits.member_id, and settlements.from_member_id/to_member_id/
-- marked_by all reference members(id) with no ON DELETE behavior defined,
-- so an unchecked delete would just fail with a raw FK violation — this
-- checks first and raises a message someone can actually act on instead.
--
-- Any trip member may remove any other (matches the existing shared-editing
-- model used by toggle_dispute/mark_settled/update_trip) — this is a
-- "everyone trusts everyone in this link" app, not a permissions system.

create or replace function remove_member(p_trip_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := get_my_member_id(p_trip_id);
begin
  if v_me is null then
    raise exception 'not a member of this trip';
  end if;

  if not exists (select 1 from members where id = p_member_id and trip_id = p_trip_id) then
    raise exception 'member not found';
  end if;

  if exists (
    select 1 from expenses
    where trip_id = p_trip_id and (payer_id = p_member_id or created_by = p_member_id)
  ) then
    raise exception 'they have expense history on this trip and can''t be removed';
  end if;

  if exists (
    select 1 from expense_splits es
    join expenses e on e.id = es.expense_id
    where e.trip_id = p_trip_id and es.member_id = p_member_id
  ) then
    raise exception 'they have expense history on this trip and can''t be removed';
  end if;

  if exists (
    select 1 from settlements
    where trip_id = p_trip_id
      and (from_member_id = p_member_id or to_member_id = p_member_id or marked_by = p_member_id)
  ) then
    raise exception 'they have settlement history on this trip and can''t be removed';
  end if;

  delete from members where id = p_member_id and trip_id = p_trip_id;
end;
$$;

grant execute on function remove_member(uuid, uuid) to authenticated;
