# TripSplit

Split trip expenses with your group. No signup — everyone joins with just their name via a shared link.

## Stack

- [Next.js](https://nextjs.org) 15 (App Router, Server Actions)
- [Supabase](https://supabase.com) (Postgres, Row Level Security, anonymous auth, Realtime)
- Tailwind CSS 4

## How it works

- Anyone can start a trip — no account required. A visit to the site signs the browser into an **anonymous Supabase session** (see `src/lib/supabase/middleware.ts`), and that session becomes a "member" row when they create or join a trip.
- A trip is reached only via its slug (`/t/<slug>`), which doubles as the access secret — the suffix is 48 bits of randomness (`src/lib/slug.ts`). There's no directory or search of trips.
- All writes (expenses, splits, settlements, dispute flags, trip edits) go through **`security definer` Postgres functions** (`supabase/migrations/`) rather than direct table access, so membership and ownership checks live in one place next to the data, not scattered across the client. RLS policies handle reads.
- Realtime (`postgres_changes`) keeps everyone's view in sync as expenses/members/settlements change — still gated by RLS, so a subscriber only ever receives events for trips they belong to.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase project's URL and anon key:
   ```bash
   cp .env.local.example .env.local
   ```
3. Apply the migrations in `supabase/migrations/` to your Supabase project, in order (via the SQL editor, or `supabase db push` once the CLI is linked).
4. Run the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Run the unit test suite once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Project layout

```
src/app/                   Routes (App Router)
  page.tsx                 Home — create a trip, or jump back into ones you've joined
  t/[slug]/                A trip: join screen, expenses, balances, settings
  actions/                 Server Actions — the only place client code talks to Supabase for writes
src/lib/
  balances.ts              Net-balance and debt-simplification math (pure functions, unit tested)
  money.ts                 Currency formatting and cent-accurate equal-split math (unit tested)
  slug.ts                  Trip slug generation (unit tested)
  supabase/                Server / browser / middleware Supabase clients
supabase/migrations/       Schema, RLS policies, and RPC functions, in application order
```

## Security model

- RLS is enabled on every table; there are no permissive `INSERT`/`UPDATE`/`DELETE` policies on `expenses`, `expense_splits`, or `settlements` — all writes to those go through RPCs that re-verify trip membership (and, for edits/deletes, ownership) server-side, ignoring anything the client claims about who it is.
- `trips.currency` and `expenses.amount` are enforced with `CHECK` constraints at the database level, not just in the Server Action, since the RPCs are callable directly by any authenticated session.
- See the comments at the top of each file under `supabase/migrations/` for the reasoning behind each policy — several exist specifically to close a hole found in the previous migration.

## Known gaps

Deliberately not built yet, because they need a product decision rather than an engineering one:

- **Leaving a trip / removing a member** — a member with expense history can't be deleted without breaking referential integrity or deciding what happens to their unsettled balance.
- **Archiving a trip** — the schema has a `status` column for it, but nothing consumes it yet.
- **Receipt attachments, notifications, CSV export, rate limiting.**
