-- Phase 5: dispute flag. Unlike edit/delete, any trip member may flag or
-- unflag an expense — disputing is inherently something someone other than
-- the creator does, and resolution happens outside the app (in the group
-- chat), so this is a lightweight, no-owner-restriction toggle.

create or replace function toggle_dispute(p_expense_id uuid)
returns expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_me uuid;
  v_expense expenses;
begin
  select trip_id into v_trip_id from expenses where id = p_expense_id;
  if v_trip_id is null then
    raise exception 'expense not found';
  end if;

  v_me := get_my_member_id(v_trip_id);
  if v_me is null then
    raise exception 'not a member of this trip';
  end if;

  update expenses set disputed = not disputed where id = p_expense_id
  returning * into v_expense;

  return v_expense;
end;
$$;

grant execute on function toggle_dispute(uuid) to authenticated;
