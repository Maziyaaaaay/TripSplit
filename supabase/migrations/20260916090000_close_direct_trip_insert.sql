-- Security fix: "authenticated can create trips" (from the Phase 1 migration)
-- still has `with check (true)`. create_trip_with_creator is security definer
-- and bypasses RLS entirely, so that policy was never needed for the app's
-- own write path — it only ever mattered for a *direct* REST insert, and
-- there it's a live hole: any signed-in session (anonymous sign-in is free)
-- can POST straight to /rest/v1/trips and create a trip row with no creator
-- membership, no slug validation, and no name/currency limits — reopening
-- exactly the orphaned-trip and unvalidated-input problems
-- create_trip_with_creator (20260912090000) was written to prevent, just via
-- a different door.
--
-- Trip creation has no legitimate reason to happen outside that RPC, so drop
-- the direct-insert policy rather than trying to replicate the RPC's checks
-- in a `with check` clause. RLS defaults to deny with no matching policy, and
-- the security-definer RPC is unaffected since it bypasses RLS on insert.

drop policy if exists "authenticated can create trips" on trips;
