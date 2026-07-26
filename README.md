# RepBook

Week-over-week gym tracker, sold to gyms (B2B). Expo (React Native) + Supabase.
Three roles in one app: `member`, `gym_admin`, `super_admin`. No public signup —
accounts are provisioned through Edge Functions.

Product docs are the source of truth: [`CLAUDE.md`](CLAUDE.md) (rulebook) and
[`docs/`](docs) (requirements → architecture → wireframes → build plan).

## Setup

```bash
npm install
cp .env.example .env   # then fill in SUPABASE_URL + SUPABASE_ANON_KEY
npx expo start         # add --tunnel for a physical phone on another network
```

`.env` is git-ignored. The app ships only the Supabase URL + anon key; the
service-role key exists solely in Edge Function secrets.

## Scripts

| Command | Does |
|---------|------|
| `npm start` | Expo dev server (`npm run start:tunnel` for a physical device) |
| `npm run typecheck` | `tsc --noEmit` (TypeScript strict, no `any`) |
| `npm run lint` | ESLint (also blocks supabase-js imports outside `src/api`) |
| `npm run db:push` | Apply `supabase/migrations/*` to the linked project |
| `npm run db:status` | Show which migrations are applied remotely |
| `npm run gen:types` | Regenerate `src/types/db.ts` from the linked schema |

## Database

```bash
npx --yes supabase login                       # opens a browser, one time
npx --yes supabase link --project-ref <ref>    # <ref> = the id in your project URL
npm run db:push                                # applies 0001_init + 0002_seed_templates
npm run gen:types                              # overwrite src/types/db.ts from the real schema
```

Then, one time only:

1. Create your own login: dashboard → Authentication → Users → Add user (email +
   password, **Auto Confirm User** ticked).
2. Run [`supabase/bootstrap-super-admin.sql`](supabase/bootstrap-super-admin.sql)
   with your UID pasted in — that makes you `super_admin`.
3. Verify tenant isolation by running
   [`supabase/tests/rls-check.sql`](supabase/tests/rls-check.sql) in the SQL
   editor; every row of the result table must say `PASS`.

Schema rules that the migration enforces: weeks are integers (never dates),
weights are kg only, `day_of_week` is 1–6 so Sunday can never be stored, renames
keep set history, deletes are soft (`archived_at`), and members can read/write
only their own rows while gym admins get aggregates through
`gym_member_activity()` — never raw logs.

## Layout

```
app/                 expo-router routes (role-gated groups)
src/api/             ALL supabase + functions.invoke calls
src/hooks/           react-query hooks
src/components/      shared UI (+ charts/)
src/lib/             supabase client, units (kg↔lb), phone (E.164), env
src/stores/ui.ts     zustand: theme + unit only
src/theme/tokens.ts  design tokens (dark-first, lime accent)
src/types/db.ts      generated Supabase types
supabase/migrations/ schema + RLS
supabase/functions/  Deno Edge Functions (service-role key lives here only)
```

## Edge Functions

Six Deno functions hold every privileged action; the service-role key exists
only in their environment.

```bash
npm run functions:deploy      # deploys all of them (skips _shared/)
```

| Function | Caller | Does |
|----------|--------|------|
| `create-member` | gym_admin | creates a member (phone, no SMS) → returns credentials once |
| `reset-member-password` | gym_admin | new temp password for their own member |
| `set-member-active` | gym_admin | bans/unbans a member's login |
| `create-gym` | super_admin | creates a gym + its first admin |
| `reset-admin-password` | super_admin | new temp password for a gym admin |
| `set-gym-active` | super_admin | suspends/restores a gym and all its logins |

## Preview build

```bash
npx eas-cli login
npx eas-cli build --profile preview --platform android
```

Profiles live in [`eas.json`](eas.json): `development` (dev client), `preview`
(internal APK / ad-hoc iOS) and `production`. The first build creates the EAS
project and writes its id into the config.

Before shipping to a pilot gym, walk the whole
[`docs/test-checklist.md`](docs/test-checklist.md) on a real device.

## Build phases

Tracked in the "Current status" checklist at the bottom of [`CLAUDE.md`](CLAUDE.md),
following the plan in [`docs/06-claude-code-prompt.md`](docs/06-claude-code-prompt.md).
