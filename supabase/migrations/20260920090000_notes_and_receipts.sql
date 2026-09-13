-- Phase 8: notes + receipt attachments on expenses.
--
-- Storage path convention is `{trip_id}/{expense_id}.{ext}` — the trip_id
-- segment is what the storage policies check against is_trip_member, the
-- same security-definer helper the table RLS already uses, so "can you read
-- this expense" and "can you read its receipt" are gated by the identical
-- membership check.
--
-- The expense id is generated in the Next.js action (not left to the
-- table's default) specifically so the storage path can be constructed and
-- the file uploaded *before* add_expense is called — otherwise there'd be
-- no id to name the file with. add_expense accepts that id via
-- p_expense_id rather than trusting the client's insert directly.
--
-- Notes get a generous but real length cap (same reasoning as the
-- amount/currency hardening: a RPC grant to `authenticated` is callable
-- directly, so the cap belongs on the table, not just in the Server Action).

alter table expenses add column if not exists notes text;
alter table expenses add column if not exists receipt_path text;
alter table expenses add constraint expenses_notes_max_length check (notes is null or char_length(notes) <= 500);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "trip members can upload their trip's receipts"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and is_trip_member((storage.foldername(name))[1]::uuid)
);

create policy "trip members can read their trip's receipts"
on storage.objects for select
to authenticated
using (
  bucket_id = 'receipts'
  and is_trip_member((storage.foldername(name))[1]::uuid)
);

create policy "trip members can replace their trip's receipts"
on storage.objects for update
to authenticated
using (
  bucket_id = 'receipts'
  and is_trip_member((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'receipts'
  and is_trip_member((storage.foldername(name))[1]::uuid)
);

create policy "trip members can delete their trip's receipts"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'receipts'
  and is_trip_member((storage.foldername(name))[1]::uuid)
);

drop function if exists add_expense(uuid, uuid, numeric, text, jsonb);

create or replace function add_expense(
  p_trip_id uuid,
  p_payer_id uuid,
  p_amount numeric,
  p_description text,
  p_splits jsonb, -- [{"member_id": "...", "share_amount": 123.45}, ...]
  p_notes text default null,
  p_receipt_path text default null,
  p_expense_id uuid default null
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

  insert into expenses (id, trip_id, payer_id, created_by, amount, description, notes, receipt_path)
  values (coalesce(p_expense_id, gen_random_uuid()), p_trip_id, p_payer_id, v_me, p_amount, p_description, p_notes, p_receipt_path)
  returning * into v_expense;

  insert into expense_splits (expense_id, member_id, share_amount)
  select v_expense.id, x.member_id, x.share_amount
  from jsonb_to_recordset(p_splits) as x(member_id uuid, share_amount numeric);

  return v_expense;
end;
$$;

grant execute on function add_expense(uuid, uuid, numeric, text, jsonb, text, text, uuid) to authenticated;

drop function if exists update_expense(uuid, uuid, numeric, text, jsonb);

create or replace function update_expense(
  p_expense_id uuid,
  p_payer_id uuid,
  p_amount numeric,
  p_description text,
  p_splits jsonb,
  p_notes text default null,
  p_receipt_path text default null
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
  set payer_id = p_payer_id, amount = p_amount, description = p_description,
      notes = p_notes, receipt_path = p_receipt_path
  where id = p_expense_id
  returning * into v_expense;

  delete from expense_splits where expense_id = p_expense_id;

  insert into expense_splits (expense_id, member_id, share_amount)
  select p_expense_id, x.member_id, x.share_amount
  from jsonb_to_recordset(p_splits) as x(member_id uuid, share_amount numeric);

  return v_expense;
end;
$$;

grant execute on function update_expense(uuid, uuid, numeric, text, jsonb, text, text) to authenticated;
