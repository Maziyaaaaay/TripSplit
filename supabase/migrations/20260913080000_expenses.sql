-- TripSplit — Phase 2 schema: expenses + expense_splits
--
-- All writes go through security-definer RPCs (add_expense, update_expense,
-- delete_expense) rather than direct table policies, because a single
-- expense write touches two tables (expenses + expense_splits) and needs
-- cross-row validation (payer/split members belong to this trip, splits sum
-- exactly to the total, only the creator may edit/delete) that plain RLS
-- can't express atomically — this is the same lesson as create_trip_with_creator
-- in the previous migration, applied to a two-table write instead of one.

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  payer_id uuid not null references members(id),
  created_by uuid not null references members(id),
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  disputed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists expense_splits (
  expense_id uuid not null references expenses(id) on delete cascade,
  member_id uuid not null references members(id),
  share_amount numeric(12,2) not null check (share_amount >= 0),
  primary key (expense_id, member_id)
);

alter table expenses enable row level security;
alter table expense_splits enable row level security;

create policy "members can read their trip's expenses"
  on expenses for select
  to authenticated
  using (is_trip_member(trip_id));

create policy "members can read their trip's expense splits"
  on expense_splits for select
  to authenticated
  using (
    exists (
      select 1 from expenses e
      where e.id = expense_splits.expense_id and is_trip_member(e.trip_id)
    )
  );

-- Returns the caller's own member row id for a trip, or null if they aren't
-- a member — used to stamp created_by server-side (never trust a client-
-- supplied "who am I" value) and to enforce "edit your own expense only".
create or replace function get_my_member_id(p_trip_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select m.id from members m
  where m.trip_id = p_trip_id and m.auth_uid = auth.uid();
$$;

grant execute on function get_my_member_id(uuid) to authenticated;

create or replace function add_expense(
  p_trip_id uuid,
  p_payer_id uuid,
  p_amount numeric,
  p_description text,
  p_splits jsonb -- [{"member_id": "...", "share_amount": 123.45}, ...]
)
returns expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := get_my_member_id(p_trip_id);
  v_expense expenses;
  v_split_sum numeric;
begin
  if v_me is null then
    raise exception 'not a member of this trip';
  end if;

  if not exists (select 1 from members m where m.id = p_payer_id and m.trip_id = p_trip_id) then
    raise exception 'payer is not a member of this trip';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_splits) as x(member_id uuid, share_amount numeric)
    left join members m on m.id = x.member_id and m.trip_id = p_trip_id
    where m.id is null
  ) then
    raise exception 'split includes a member outside this trip';
  end if;

  select sum(share_amount) into v_split_sum
  from jsonb_to_recordset(p_splits) as x(member_id uuid, share_amount numeric);

  if v_split_sum is null or v_split_sum <> p_amount then
    raise exception 'splits must add up to the expense amount';
  end if;

  insert into expenses (trip_id, payer_id, created_by, amount, description)
  values (p_trip_id, p_payer_id, v_me, p_amount, p_description)
  returning * into v_expense;

  insert into expense_splits (expense_id, member_id, share_amount)
  select v_expense.id, x.member_id, x.share_amount
  from jsonb_to_recordset(p_splits) as x(member_id uuid, share_amount numeric);

  return v_expense;
end;
$$;

grant execute on function add_expense(uuid, uuid, numeric, text, jsonb) to authenticated;

create or replace function update_expense(
  p_expense_id uuid,
  p_payer_id uuid,
  p_amount numeric,
  p_description text,
  p_splits jsonb
)
returns expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_created_by uuid;
  v_me uuid;
  v_expense expenses;
  v_split_sum numeric;
begin
  select trip_id, created_by into v_trip_id, v_created_by from expenses where id = p_expense_id;
  if v_trip_id is null then
    raise exception 'expense not found';
  end if;

  v_me := get_my_member_id(v_trip_id);
  if v_me is null or v_me <> v_created_by then
    raise exception 'only the person who logged this expense can edit it';
  end if;

  if not exists (select 1 from members m where m.id = p_payer_id and m.trip_id = v_trip_id) then
    raise exception 'payer is not a member of this trip';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_splits) as x(member_id uuid, share_amount numeric)
    left join members m on m.id = x.member_id and m.trip_id = v_trip_id
    where m.id is null
  ) then
    raise exception 'split includes a member outside this trip';
  end if;

  select sum(share_amount) into v_split_sum
  from jsonb_to_recordset(p_splits) as x(member_id uuid, share_amount numeric);

  if v_split_sum is null or v_split_sum <> p_amount then
    raise exception 'splits must add up to the expense amount';
  end if;

  update expenses
  set payer_id = p_payer_id, amount = p_amount, description = p_description
  where id = p_expense_id
  returning * into v_expense;

  delete from expense_splits where expense_id = p_expense_id;

  insert into expense_splits (expense_id, member_id, share_amount)
  select p_expense_id, x.member_id, x.share_amount
  from jsonb_to_recordset(p_splits) as x(member_id uuid, share_amount numeric);

  return v_expense;
end;
$$;

grant execute on function update_expense(uuid, uuid, numeric, text, jsonb) to authenticated;

create or replace function delete_expense(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_created_by uuid;
  v_me uuid;
begin
  select trip_id, created_by into v_trip_id, v_created_by from expenses where id = p_expense_id;
  if v_trip_id is null then
    raise exception 'expense not found';
  end if;

  v_me := get_my_member_id(v_trip_id);
  if v_me is null or v_me <> v_created_by then
    raise exception 'only the person who logged this expense can delete it';
  end if;

  delete from expenses where id = p_expense_id;
end;
$$;

grant execute on function delete_expense(uuid) to authenticated;
