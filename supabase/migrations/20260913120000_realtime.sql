-- Phase 3: live balances need the group to see each other's changes without
-- reloading. Add the relevant tables to Supabase's realtime publication so
-- postgres_changes subscriptions fire — RLS still applies to these events,
-- so a subscriber only receives changes for trips they're a member of.

alter publication supabase_realtime add table members;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table expense_splits;
