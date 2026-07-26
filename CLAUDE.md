# RepBook — Essentials (AI Coding Context)

> Place this file at the repo root as `CLAUDE.md`. Companion docs live in `docs/`:
> `01-wireframes.md` · `02-requirements.md` · `03-architecture.md` · `05-b2b-multitenancy.md` · `06-claude-code-prompt.md` (build plan).
> This file is the rulebook. When in doubt: requirements → architecture → wireframes, in that order. Ask only if docs don't answer it.

---

## What we're building

RepBook — a week-over-week gym tracker **sold to gyms (B2B)**. Three roles in one app:
- **member**: logs in with phone+password given by their gym; picks weekdays (Mon–Sat, Sunday always rest), logs sets (weight kg + reps) per week, compares any two weeks per exercise in charts. Core loop = open app → one tap → log today.
- **gym_admin**: manages their gym's members (create with phone → generated password shown once, reset password, deactivate). Sees activity aggregates, never raw logs.
- **super_admin** (the developer): onboards gyms, sees platform stats.

No public signup. Accounts are provisioned via Edge Functions.

## Stack (do not deviate without asking)

- **Expo (React Native) + TypeScript strict** — managed workflow, expo-router
- **Supabase**: Auth (phone + email identities) · Postgres + RLS · **Edge Functions (Deno)** for all provisioning/admin actions. All SQL in `supabase/migrations/`
- **@tanstack/react-query** for server data · **zustand** only for UI state (theme, unit)
- **victory-native** for charts
- No Redux, no Firebase, no styled-components, no NativeWind unless explicitly requested

## Golden rules

1. **All Supabase calls live in `src/api/*` only.** Components never import supabase-js directly.
2. **Service-role key exists ONLY in Edge Functions.** Never in app code, env shipped to clients, or committed files.
3. **Every admin action goes through an Edge Function** (create-member, reset-member-password, set-member-active, create-gym) that re-verifies the caller's role from `profiles` and tenant ownership before acting. Never trust client-side role.
4. **Role comes from `profiles.role`,** loaded server-side; routing gates every group: `(tabs)` member-only, `(admin)` gym_admin-only, `(super)` super_admin-only.
5. **Phone numbers are E.164** (`+919876543210`). Normalize in `src/lib/phone.ts` (+91 default). Provisioning uses `phone_confirm: true` / `email_confirm: true` → zero SMS/email cost.
6. **Generated credentials render exactly once** (CredentialCard: Copy + WhatsApp share) and are never stored client-side or logged.
7. **Weights stored in kg, always.** Convert to lb only at display via `src/lib/units.ts`.
8. **Weeks are integers (`week_number`), not dates.** Never key logs by calendar date.
9. **Sunday never exists in data.** `day_of_week` is 1–6 (Mon–Sat). UI renders Sunday as a static rest card.
10. **Auto-save, no save buttons.** Set inputs: local state instantly → debounce 500ms → upsert on `(exercise_id, week_number, set_number)` → optimistic with rollback on error.
11. **Renaming an exercise keeps its history** (update `name` on same row). **Deleting = soft archive** (`archived_at`) with confirm dialog.
12. **RLS on every table before any client code touches it.** Members: own rows. Admin/super reads: only via the security-definer functions (`gym_member_activity()`, `platform_stats()`).
13. **`must_change_password` is blocking** — no route escapes until the user sets their own password.
14. **TypeScript strict, no `any`.** DB types generated into `src/types/db.ts`.
15. **Keep the log screen fast**: local input state, memoized rows, no full-list re-render per keystroke.

## Design tokens (dark-first, one accent)

```ts
// src/theme/tokens.ts
export const colors = {
  bg: '#101113', card: '#191B1E', card2: '#212428', line: '#2B2F34',
  text: '#F2F3F4', muted: '#9AA0A6', dim: '#6B7178',
  accent: '#B5F04A', accentDark: '#232A12', danger: '#F07A6A',
};
export const radius = { card: 14, input: 9, chip: 999 };
export const fonts = { display: 'BarlowCondensed_600SemiBold', body: 'Inter_400Regular', bodyMed: 'Inter_500Medium' };
```

- Dark default. Numbers/headings in condensed display font. One accent (lime); danger red only for destructive.
- Tap targets ≥ 44pt. `keyboardType="decimal-pad"` (weight) / `"number-pad"` (reps/phone).
- Every screen ships loading + error + empty states; empty states instruct ("Add your first exercise 👇").

## File map (where things go)

```
app/(auth)/login.tsx                   # Member(phone)/Admin(email) segmented tabs
app/change-password.tsx                # forced first-login change (blocking)
app/(onboarding)/plan-setup.tsx        # member first run: days + exercises/templates
app/(tabs)/index.tsx charts.tsx        # member Home + Charts
app/day/[day].tsx                      # week chips
app/log/[day]/[week].tsx               # CORE logging screen
app/(admin)/members.tsx add-member.tsx # gym admin panel
app/(super)/dashboard.tsx add-gym.tsx  # platform owner
app/settings.tsx                       # units, theme, sign out, "Managed by <gym>"
src/api/{plan,sets,charts,admin,super}.ts     # ALL supabase + functions.invoke calls
src/hooks/{useProfile,useDayLog,usePlan,useChartData,useMembers,usePlatformStats}.ts
src/components/{ExerciseCard,SetRow,WeekChips,DayGrid,StatCard,MemberRow,CredentialCard}.tsx
src/components/charts/{ComparisonBars,TrendLine}.tsx
src/lib/{supabase,units,phone}.ts
src/stores/ui.ts · src/theme/tokens.ts · src/types/db.ts
supabase/migrations/0001_init.sql      # full schema from 03-architecture.md §1
supabase/functions/{create-member,reset-member-password,set-member-active,create-gym}/
```

## Commands

```bash
npx expo start                 # dev (or --tunnel for physical phone)
npm run typecheck              # tsc --noEmit
npm run lint                   # eslint
npx supabase db push           # apply migrations
npx supabase functions deploy <name>
npx supabase gen types typescript --project-id <id> > src/types/db.ts
eas build --profile preview
```

## Definition of done (every task)

- [ ] Typecheck + lint pass
- [ ] Works on iOS and Android (Expo Go at minimum; functions tested via dev project)
- [ ] Loading, error, and empty states handled
- [ ] No supabase import outside `src/api` · no service key outside functions
- [ ] New tables/migrations include RLS · admin paths re-verify role server-side
- [ ] Matches wireframes + tokens (no new colors/fonts invented)

## How to work with me (the human)

- Follow the phase plan in `docs/06-claude-code-prompt.md`. One phase at a time; stop at each checkpoint for my confirmation.
- Ship vertical slices inside a phase: migration → api fn → hook → screen.
- Prefer complete files over fragments. Brief summaries, code first.
- If ambiguous: check `02-requirements.md` → `03-architecture.md` → `01-wireframes.md`; only then ask — one question max.
- Never add features outside the PRD (no rest timers, nutrition, AI coach, payments).
- Tell me explicitly whenever a step needs MY manual action (Supabase dashboard, keys, seeding super admin, deploying functions) and wait.

## Current status (update as phases complete)

- [x] Validated interactive HTML prototype (`gym-tracker-prototype.html`)
- [x] Phase 0 — Scaffold + theme (Expo SDK 54 / RN 0.81 — pinned for Expo Go on device; expo-router, tokens + fonts, app.config.ts env, eslint/typecheck)
- [x] Phase 1 — Supabase schema + RLS + types (migrations pushed, types generated; RLS smoke test in `supabase/tests/rls-check.sql` still to be run)
- [x] Phase 2 — Auth + role routing + forced password change (login tabs, AuthGate router, useProfile, role placeholders)
- [x] Phase 3 — Member core (plan setup, home, day/weeks, log screen with debounced auto-save)
- [x] Phase 4 — Charts (comparison bars + trend line via victory-native; Skia WASM wired for web)
- [x] Phase 5 — Edge Functions + Admin panel (4 functions written; members list, add-member, credential card, reset/deactivate — awaiting `functions deploy` + on-device test)
- [x] Phase 6 — Super admin dashboard (platform totals, gym list, add-gym with one-time credentials, gym suspend/restore via new `set-gym-active` function, gym-admin password reset via `reset-admin-password`)
  - **Decided:** super admin sees per-gym *counts only* — never member identities, logins or logs. Password resets go one level down only: super → gym admin, gym admin → member.
- [x] Phase 7 — Polish + preview build · settings (kg/lb, ghost toggle, managed-by), FR-18 ghost "last wk" values + PR chip, haptics on set complete, persisted query cache for offline reads, guarded Sentry, eas.json, `docs/test-checklist.md`
  - **Not built:** light theme. US-22 asks for a theme toggle, but the token set is dark-only and adding a light palette means inventing colors plus converting every StyleSheet to a theme factory. Flagged for a decision rather than shipping a dead toggle.
  - **Open:** `reset-admin-password` needs `npm run functions:deploy`; phone login verified only via the real `create-member` path.
