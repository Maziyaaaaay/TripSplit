-- Phase 6: trip settings. Name, destination, and end date were only ever
-- set at creation with no way to fix a typo or add dates later. Currency is
-- deliberately NOT editable here: every recorded amount is a bare number
-- with no stored currency-per-expense, so changing a trip's currency after
-- expenses exist would silently reinterpret every past amount in a new
-- currency rather than converting it — that's a correctness bug, not a
-- feature. A trip that needs a different currency should be recreated.
--
-- Same pattern as the rest of the app: any trip member may edit (matches
-- toggle_dispute/mark_settled's existing "shared trip, shared editing"
-- model), enforced via get_my_member_id rather than a table policy.

create or replace function update_trip(
  p_trip_id uuid,
  p_name text,
  p_destination text,
  p_end_date date
)
returns trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := get_my_member_id(p_trip_id);
  v_trip trips;
begin
  if v_me is null then
    raise exception 'not a member of this trip';
  end if;

  update trips
  set name = p_name, destination = p_destination, end_date = p_end_date
  where id = p_trip_id
  returning * into v_trip;

  return v_trip;
end;
$$;

grant execute on function update_trip(uuid, text, text, date) to authenticated;
