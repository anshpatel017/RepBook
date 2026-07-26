# RepBook — Product Requirements Document (B2B Edition)

## 1. Overview

**Product:** RepBook — week-over-week workout tracker, sold to gyms (B2B2C).
**Platform:** iOS + Android (React Native / Expo). Backend: Supabase.
**Business model:** Gyms subscribe → gym owner (admin) provisions member accounts → members track workouts. Developer (super admin) manages gyms on the platform.

**One-liner:** Gyms give every member a personal progress tracker — members log sets/weights/reps per week and always see what they lifted last week.

**Differentiators:** dead-simple logging · week-vs-week comparison charts · gym-managed accounts (no signup friction, gym controls access) · member privacy (gym sees activity, not lifts).

## 2. Roles & Users

| Role | Who | Summary |
|------|-----|---------|
| `super_admin` | Developer (platform owner) | Onboards gyms, sees platform-wide stats |
| `gym_admin` | Gym owner/staff | Creates/deactivates members, resets passwords, sees activity |
| `member` | Gym member | Tracks workouts (phone + password login) |

No public self-signup in v1 (self-serve B2C = P2, same schema with `gym_id = null`).

## 3. User Stories

### Auth & Accounts
- **US-01**: As a member, I log in with my phone number + the password my gym gave me.
- **US-02**: As a member, on first login I'm forced to set my own password.
- **US-03**: As a gym admin, I log in with email + password (also forced change on first login).
- **US-04**: As a member who forgot my password, I ask my gym; the admin resets it (no SMS/OTP).
- **US-05**: As any deactivated user, I cannot log in and I see "contact your gym".

### Member — Plan & Logging (core loop)
- **US-06**: On first run I pick training days (Mon–Sat; Sunday always rest) and build my plan or pick a template (PPL / Upper-Lower / Bro split).
- **US-07**: I open the app and tap once to log today's workout in the current week.
- **US-08**: I add exercises to a day; I log any number of sets, each with weight + reps.
- **US-09**: Entries save automatically as I type.
- **US-10**: I can add/remove sets, rename exercises (history preserved), delete exercises (confirm).
- **US-11**: I create the next week and log the same plan again; I can open and edit any past week.

### Member — Progress
- **US-12**: I select any two weeks and see a per-exercise comparison chart (best set weight), filterable by day.
- **US-13**: I select one exercise and see its trend across all weeks.

### Gym Admin
- **US-14**: I see my members list with name, phone, last-workout date, weeks logged, active status; searchable.
- **US-15**: I add a member (name + phone) → the app creates the account and shows phone + generated password ONCE, with Copy/WhatsApp share.
- **US-16**: I reset a member's password (new temp password shown once).
- **US-17**: I deactivate a member (stops paying → login banned instantly) and can reactivate.
- **US-18**: I never see members' actual workout logs — only aggregates (privacy by design).

### Super Admin
- **US-19**: I see totals (gyms, members, active-30d) and a per-gym table.
- **US-20**: I add a gym (name, city, owner name/email) → app creates the gym-admin account and shows credentials once.
- **US-21**: I deactivate a gym (all its logins effectively disabled).

### Settings
- **US-22**: Members switch units (kg/lb) and theme; "Managed by <gym>" shown; sign out.

## 4. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Roles: super_admin / gym_admin / member on profiles; role-based routing | P0 |
| FR-2 | Multi-tenancy: gyms table; every member/admin belongs to one gym | P0 |
| FR-3 | Member login = phone (E.164) + password; admin login = email + password; NO public signup | P0 |
| FR-4 | Member/admin provisioning via Edge Functions using Supabase Admin API with `phone_confirm/email_confirm: true` (zero SMS/email cost) | P0 |
| FR-5 | Forced password change on first login (`must_change_password`) | P0 |
| FR-6 | Admin actions via Edge Functions only: create-member, reset-member-password, set-member-active, create-gym (super) | P0 |
| FR-7 | RLS: members own-data only; admins read own-gym profiles/aggregates; super reads all | P0 |
| FR-8 | Member plan: days Mon–Sat → ordered exercises; Sunday never stores data | P0 |
| FR-9 | Week-numbered logs; sets = weight numeric(5,2) kg + reps int; auto-save upsert on (exercise, week, set_number) | P0 |
| FR-10 | Create next week; any past week editable | P0 |
| FR-11 | Rename keeps history; delete = soft archive with confirm | P0 |
| FR-12 | Comparison chart (any 2 weeks, best-set kg per exercise, day filter) + trend chart (one exercise, all weeks) | P0 |
| FR-13 | Admin members list with activity aggregates (last workout, weeks logged) + search | P0 |
| FR-14 | Credentials displayed once with Copy + WhatsApp share | P0 |
| FR-15 | Super dashboard: platform totals + per-gym stats; add/deactivate gym | P0 |
| FR-16 | Plan templates at member onboarding | P1 |
| FR-17 | kg/lb toggle (store kg, convert at display) | P1 |
| FR-18 | Ghost "last week" values in Log view (toggle) · PR chip · +2.5/+5 steppers | P1 |
| FR-19 | Gym-scoped weekly leaderboard (opt-in) | P2 |
| FR-20 | Self-serve B2C signup (gym_id null) | P2 |
| FR-21 | Share progress card as image | P2 |
| FR-22 | Training blocks (reset week counter, archive) | P2 |

**Out of scope v1:** rest timer, exercise video library, nutrition, wearables, AI coach, in-app payments/billing (invoicing gyms is manual at first).

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Security | RLS on every table; service-role key exists ONLY inside Edge Functions; role checked server-side on every admin action |
| Privacy | Admins see aggregates, never raw logs; deactivation immediate (auth ban) |
| Performance | Log screen interactive < 1s mid-range Android; input latency < 100ms |
| Reliability | No data loss on app kill; writes flushed on change with retry |
| Offline | Reads cached (react-query persist); writes need network in v1 with clear error UI; full offline queue = v1.5 |
| Accessibility | Dynamic type, contrast ≥ 4.5:1, labeled inputs |
| Compliance | Account/data deletion possible via super admin (gym contract handles member data terms) |
| App size | < 40 MB installed |

## 6. Success Metrics

- Gyms onboarded; members provisioned per gym
- Activation: % of provisioned members who log ≥1 workout in 7 days (target 60%+ — gym pushes adoption)
- Core habit: % weekly actives logging ≥2 workouts/week (50%+)
- Gym retention: gyms active after 3 months (80%+)
- Charts opened ≥1×/week by 30%+ members · crash-free ≥ 99.5%

## 7. Release Plan (matches build phases in 06-claude-code-prompt.md)

| Milestone | Contents |
|-----------|----------|
| **v0.1** | Phases 0–3: scaffold, DB+RLS, auth+roles, member core loop — internal test |
| **v0.5** | Phases 4–6: charts, Edge Functions, admin panel, super dashboard — pilot with 1 real gym |
| **v1.0** | Phase 7 polish + EAS builds + store listings + crash/analytics — sell to gyms |
| **v1.x** | Templates, ghost values, PRs, steppers, kg/lb |
| **v2.0** | Gym leaderboards, share cards, B2C self-serve |
