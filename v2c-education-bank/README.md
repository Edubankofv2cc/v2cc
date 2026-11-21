# V2C Education Bank

**Village 2 City Club** · 👉 **New here? Read [SETUP.md](SETUP.md) for step-by-step setup.**

**Village 2 City Club** — *உதவுகின்றோம் உங்களிற்கு, உதவிடுங்கள் பிறருக்கு*

A bilingual (English / தமிழ்) platform that turns donations into real school supplies for rural students.
Donor accounts work like bank accounts, but they hold **item quantities**, not money. When items reach students, the club records the handover with a photo and debits the donor's balance.

## Stack
React 19 · Vite · React Router 7 · TypeScript · Tailwind CSS v4 · shadcn-style Radix components · Lucide · Supabase (Postgres + RLS, Auth, Storage, Edge Functions)

## Setup
```bash
npm install
cp .env.example .env          # add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```
Apply the database migration (pick one):
```bash
supabase link --project-ref <ref> && supabase db push
```
…or paste `supabase/migrations/*.sql` into the Supabase SQL editor.

Then:
1. **Auth → Providers:** enable Email, plus Google (client ID and secret from Google Cloud). Add `https://<your-domain>/dashboard` to the redirect URLs.
2. **Auth → Email templates:** paste `supabase/templates/*.html`. These are bilingual confirmation and recovery emails.
3. **First admin:** sign up normally, then run `supabase/seed_admin.sql` with your email. This is the only way to grant admin.
4. **Admin → Settings:** set the real bank account details and the membership threshold.
5. `npm run dev` for local development, `npm run build` for production (`dist/`). SPA rewrites are included for Vercel and Netlify.

## How the rules are enforced (in the database, not in the UI)
| Rule | Where |
|---|---|
| Sign-up is always `donor`; `role` in sign-up metadata is ignored | `handle_new_user()` trigger; `user_roles` has no client write policy |
| Admin is checked against the `user_roles` table, never JWT metadata | `has_role()` / `is_admin()` (SECURITY DEFINER) |
| Donors can only create **pending** deposits for themselves; the price is computed on the server | RLS + `deposits_before_write()` |
| Approve and reject are admin-only; rejection needs a reason | `review_deposit()` RPC |
| **Distribution can never exceed the donor's balance**; race-safe | `distributions_before_write()` with a per donor+item advisory lock |
| An approved deposit can't be revoked once its items have been distributed | `deposits_before_write()` |
| Membership = approved qualifying items ≥ `app_settings.membership_threshold` | `donor_membership` view |
| Receipts are private (owner + admins); proof photos need sign-in; admins upload | Storage policies on the `receipts` and `proofs` buckets |
| The public home page gets aggregates only: no donor identities, no photos | `public_stats()`, `public_feed()`, `recent_distributions()` |
| Bilingual in-app notifications when a deposit is reviewed or items are distributed | `notify_*` triggers |

Admin CSV export protects against spreadsheet formula injection (cells starting with `= + - @` are prefixed and every cell is quoted) and is UTF-8 with a BOM, so Tamil text opens correctly in Excel.

### Tests
```bash
npm run test:db    # spins up a throwaway Postgres, applies the migration on a Supabase stub, runs rules_test.sql
```
`initdb` refuses to run as root; in that case run `su postgres -c "npm run test:db"`.

## MCP server (agents)
`supabase/functions/mcp` is a stateless Streamable-HTTP MCP server with caller-scoped, read-only tools:
- `my_item_balances`: confirmed balances per item, plus membership status
- `my_recent_deposits`: recent deposits with reference codes and approval states (`limit`, `status`)

It forwards the caller's own access token to PostgREST, so RLS limits every answer to that donor. The service-role key is never used.
```bash
supabase functions deploy mcp
# POST https://<ref>.supabase.co/functions/v1/mcp   Authorization: Bearer <donor access token>
```

## Project layout
```
src/i18n/          dictionary (en + ta, type-checked for parity), language provider
src/auth/          session, profile, role lookup
src/pages/         Home, About, Auth, dashboard/*, admin/*
src/components/    layout, UI kit, proof image (signed URLs)
supabase/          migration, tests, edge function, email templates, config
```
