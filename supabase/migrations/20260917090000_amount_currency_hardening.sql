-- Hardening: add_expense/update_expense and create_trip_with_creator only
-- reject an out-of-range amount or an unsupported currency inside the
-- Next.js server action (MAX_AMOUNT in src/app/actions/expenses.ts,
-- ALLOWED_CURRENCIES in src/app/actions/trips.ts). Both RPCs are
-- `grant execute ... to authenticated`, so any signed-in session (anonymous
-- sign-in is free) can call them directly and skip that validation entirely
-- — there was nothing stopping a 50-million-unit expense or a currency of
-- "LOL" from landing straight in the tables.
--
-- Move both bounds into table CHECK constraints so they hold no matter which
-- client calls the RPC — security-definer functions bypass RLS, but never
-- bypass CHECK constraints, so this closes the gap for the existing RPCs
-- and any future write path without touching their logic.

alter table expenses
  add constraint expenses_amount_max check (amount <= 10000000);

alter table trips
  add constraint trips_currency_allowed check (currency in ('INR', 'USD', 'EUR', 'GBP'));
