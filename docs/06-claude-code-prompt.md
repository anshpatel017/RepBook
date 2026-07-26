# RepBook — Claude Code Build Prompt (from zero)

> **How to use:**
> 1. Create an empty folder `repbook/`, open it in Claude Code
> 2. Put `04-essentials-vibecoding.md` at the root renamed to **`CLAUDE.md`**
> 3. Put the other docs in **`docs/`**: `01-wireframes.md`, `02-requirements.md`, `03-architecture.md`, `05-b2b-multitenancy.md`, and this file as `docs/06-claude-code-prompt.md`
> 4. Paste the KICKOFF PROMPT below into Claude Code

---

## KICKOFF PROMPT (copy-paste this)

```
You are building RepBook from zero in this empty repo.

Read CLAUDE.md fully, then read docs/02-requirements.md, docs/03-architecture.md,
docs/01-wireframes.md, and docs/05-b2b-multitenancy.md. These docs are the source
of truth — do not invent features or deviate from the stack, schema, or rules.

Build phase-by-phase following docs/06-claude-code-prompt.md.
Work rules:
- Complete ONE phase at a time. At each phase checkpoint: run typecheck + lint,
  summarize what you built in 5 bullets max, list anything I must do manually
  (Supabase dashboard steps, env keys, deploys, seeding), then STOP and wait
  for me to confirm before starting the next phase.
- Inside a phase, build vertical slices (migration → api → hook → screen) and
  keep every file complete and paste-ready.
- Update the "Current status" checklist in CLAUDE.md when a phase completes.
- If something is ambiguous, check requirements → architecture → wireframes,
  in that order. Only ask me if the docs truly don't answer it (one question max).

Start now with Phase 0.
```

---

## Phase Plan (checkpoints = stop & confirm)

### Phase 0 — Scaffold + Theme
Create the Expo app (TypeScript strict, expo-router), install deps (@supabase/supabase-js, @tanstack/react-query, zustand, victory-native, expo-secure-store, expo-clipboard, @expo-google-fonts/barlow-condensed, @expo-google-fonts/inter), set up folder structure from CLAUDE.md file map, `src/theme/tokens.ts`, font loading, eslint + typecheck scripts, `.env` handling via app.config.ts (SUPABASE_URL, SUPABASE_ANON_KEY placeholders), .gitignore.
**Checkpoint:** app boots in Expo Go showing a placeholder screen with the dark theme + fonts. Typecheck/lint pass.

### Phase 1 — Database (Supabase)
Write `supabase/migrations/0001_init.sql` exactly per docs/03-architecture.md §1 (gyms, profiles, exercises, workout_sets, templates, helper fns, ALL RLS policies, signup trigger, gym_member_activity(), platform_stats()). Add a `0002_seed_templates.sql` with 3 templates (PPL, Upper/Lower, Bro split). Provide `src/lib/supabase.ts` and a script/README section for generating `src/types/db.ts`.
**Human steps (tell me, then wait):** create Supabase project, put URL + anon key in .env, run `supabase db push`, generate types, create my own user (email+password) and run the bootstrap SQL to make me super_admin.
**Checkpoint:** migrations applied cleanly, types generated, RLS verified (member can't read another user's rows — include a quick test note).

### Phase 2 — Auth + Role Routing
Login screen with Member (phone+password, +91 normalize via src/lib/phone.ts) / Admin (email+password) segmented tabs per wireframes. Session persistence (expo-secure-store). Root `_layout.tsx` role router: no session → login; must_change_password → blocking change-password screen; member && !onboarded → plan-setup; else route by role to (tabs)/(admin)/(super). `useProfile` hook. Friendly errors incl. banned/inactive → "contact your gym". Placeholder screens for (admin) and (super).
**Checkpoint:** I can log in as super_admin and land on the (super) placeholder; wrong creds show proper errors; change-password flow works end to end.

### Phase 3 — Member Core Loop
Plan setup (pick days Mon–Sat, add exercises manually or from a template; sets `onboarded=true`). Home (Start today CTA → today+current week, stat cards, day grid with Sunday rest card). Day screen (week chips, ✓ markers, + New week updates profiles.current_week). Log screen: ExerciseCard + SetRow with debounced auto-save upserts, add/remove set, inline rename, soft-delete with confirm, empty states. All data via src/api + hooks with optimistic updates.
**Checkpoint (the big one):** on my phone as a test member I can complete plan setup, log a full workout, create week 2, edit week 1 — and everything persists after app restart.

### Phase 4 — Charts
Charts tab per wireframes: day filter + two week selectors → grouped bars (best-set kg per exercise, gray vs lime); exercise selector → trend line across all weeks. Empty states for no data / <2 weeks.
**Checkpoint:** with 2+ logged weeks, both charts render correctly and update with selectors.

### Phase 5 — Edge Functions + Admin Panel
Implement the four functions per docs/05 (create-member, reset-member-password, set-member-active, create-gym) with caller-role + tenant verification. Admin UI: members list (via gym_member_activity(): name, phone, last workout, weeks logged, active badge, search; >14d inactivity amber), add-member flow with one-time CredentialCard (Copy + WhatsApp share), member sheet (reset password / deactivate / reactivate with confirms).
**Human steps:** `supabase functions deploy` for each.
**Checkpoint:** as gym_admin I can create a real member, log in as that member on another device/session, reset their password, deactivate them (login blocked with correct message), reactivate.

### Phase 6 — Super Admin
Dashboard via platform_stats(): totals (gyms, members, active-30d) + gym list with per-gym stats; add-gym flow (creates gym + gym_admin, one-time credentials); gym detail with deactivate/reactivate.
**Checkpoint:** as super_admin I create a gym, log in as its new admin, and the full chain works: super → gym admin → member → workout logged → numbers show up in both dashboards.

### Phase 7 — Polish + Preview Build
Settings (kg/lb display conversion, theme toggle, "Managed by <gym>", sign out). Sweep every screen for loading/error/empty states, confirms, haptics on set-complete, keyboard behavior (KeyboardAvoidingView on log screen), react-query persistQueryClient for offline reads. Sentry init. EAS config (dev/preview/production) + preview build instructions.
**Checkpoint:** installable preview build on a real device passes a full manual test script (write the script as docs/test-checklist.md).

---

## After Phase 7 (not for Claude Code yet — human decides)

Store listings + screenshots · pilot with 1 real gym · then v1.x backlog per PRD (templates polish, ghost last-week values, PR chips, steppers) · v2.0 gym leaderboards + share cards.
