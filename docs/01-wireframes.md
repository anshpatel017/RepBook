# RepBook — UI/UX Wireframes (B2B Edition)

> Working name: **RepBook**. B2B model: gyms buy the app → gym admin creates member accounts (phone + password) → members track workouts.
> Dark theme default. Mobile-first (React Native). One accent: lime `#B5F04A`, condensed display font (Barlow Condensed) for numbers, Inter for body.

---

## Navigation Map (role-based)

```
                 ┌─────────────────────┐
                 │       LOGIN         │
                 │ [Member] [Admin] tab│
                 │ phone     email     │
                 └──────────┬──────────┘
                            │ session
                 ┌──────────▼──────────┐
                 │ must_change_password?│──yes──► CHANGE PASSWORD (blocking)
                 └──────────┬──────────┘
                            │ role router
        ┌───────────────────┼───────────────────────┐
        ▼ member            ▼ gym_admin             ▼ super_admin
  first login?         ┌──────────────┐        ┌──────────────┐
  → PLAN SETUP         │ ADMIN PANEL  │        │ SUPER DASH   │
        │              │ members list │        │ gyms + stats │
        ▼              │ add member   │        │ add gym      │
  ┌──────────┐         └──────────────┘        └──────────────┘
  │  HOME    │◄──► CHARTS (tabs)
  └────┬─────┘
       ▼
  DAY VIEW → WEEK LIST → LOG VIEW
```

**Rules:**
- No public signup. Members are created by their gym; gym admins are created by super admin.
- The most common member action (log today's workout) is 1 tap from Home.

---

## Screen 1 — Login

```
┌──────────────────────────┐
│        [LOGO]            │
│       RepBook            │
│  "Beat last week."       │
│                          │
│ ┌─[ Member ]─[ Admin ]─┐ │  ← segmented tabs
│ │                      │ │
│ │ Member tab:          │ │
│ │ ┌──────────────────┐ │ │
│ │ │ +91 Phone number │ │ │  ← number pad, auto +91 prefix
│ │ └──────────────────┘ │ │
│ │ ┌──────────────────┐ │ │
│ │ │ Password         │ │ │
│ │ └──────────────────┘ │ │
│ │ [    Sign in     ]   │ │  ← lime CTA
│ │                      │ │
│ │ Forgot password?     │ │  ← opens sheet: "Ask your gym
│ └──────────────────────┘ │     to reset it for you."
│                          │
│  Admin tab: email +      │
│  password (same layout)  │
└──────────────────────────┘
```

**States:**
- Wrong credentials → "Phone or password incorrect."
- Deactivated/banned account → "Your account is inactive. Contact your gym."

## Screen 1b — Forced Password Change (first login)

```
┌──────────────────────────┐
│  Set your own password   │
│  You're using a temporary│
│  password from your gym. │
│  ┌────────────────────┐  │
│  │ New password       │  │
│  ┌────────────────────┐  │
│  │ Repeat password    │  │
│  [   Save & continue  ]  │  ← blocking: no skip
└──────────────────────────┘
```

## Screen 1c — Plan Setup (member first run, after password)

1. "Pick your training days" (Mon–Sat toggles; Sunday locked as Rest)
2. "Build your plan or pick a template" (PPL / Upper-Lower / Bro split) → per-day exercise list
3. → Home

---

## Screen 2 — Home (member, Tab 1)

```
┌──────────────────────────┐
│ RepBook          [⚙]    │
│ Saturday · Week 4        │
│ ┌──────────────────────┐ │
│ │ ▶ START SATURDAY'S   │ │ ← jumps straight to Log
│ │   WORKOUT            │ │   (today + current week)
│ └──────────────────────┘ │
│ ┌──────┐┌──────┐┌──────┐ │
│ │  4   ││ 156  ││ 160  │ │ ← weeks / sets / best kg
│ └──────┘└──────┘└──────┘ │
│ YOUR WEEK                │
│ [Mon][Tue][Wed][Thu]     │ ← 2-col day grid
│ [Fri][Sat]               │
│ [ Sunday · Rest day 😴 ] │ ← dashed, dimmed, not tappable
│  [⌂ Home]    [📈 Charts] │
└──────────────────────────┘
```
- Today = Sunday → CTA disabled: "Rest day — recover well".

## Screen 3 — Day View (week chips)

```
[←] Monday — Pick a week
(Week 1 ·✓)(Week 2 ·✓)(Week 3 ·✓)(Week 4)(＋ New week)
```
- ✓ = has logged data · current week = lime outline · default scroll shows current week.

## Screen 4 — Log View (core screen)

```
┌──────────────────────────┐
│ [←] Monday · Week 4      │
│ ┌──────────────────────┐ │
│ │ Incline bench press ✏️🗑│
│ │ SET  WEIGHT  REPS    │ │
│ │  1   [ 65 ]  [ 12 ] ✕│ │ ← number pad inputs
│ │  2   [72.5]  [ 10 ] ✕│ │
│ │  ＋ Add set          │ │
│ └──────────────────────┘ │
│ [ Add exercise…  ][Add]  │
└──────────────────────────┘
```
- Auto-save on change (no save button) · ✏️ inline rename (keeps history) · 🗑 delete with confirm · empty day → "No exercises yet. Add your first one 👇".
- Phase 2: ghost `last wk: 60 × 12` under inputs · PR chip `🔥 +5 kg` · +2.5/+5 steppers.

## Screen 5 — Charts (member, Tab 2)

```
Progress
[ Day: Monday ▾ ]
[ Week 1 ▾]  vs  [Week 4 ▾]
┌ BEST SET PER EXERCISE ┐   ← grouped bars (gray vs lime), y = kg
┌ EXERCISE OVER TIME    ┐   ← [exercise ▾] line across all weeks
```
- Empty: "No logged sets for these weeks yet." / "Log a few weeks to see the trend."

## Screen 6 — Settings (member)

Profile · Units kg/lb · Theme · Manage plan · Sign out. (No delete account — gym owns membership; show "Managed by <gym name>".)

---

## Screen 7 — Admin: Members List

```
┌──────────────────────────┐
│ FitZone Gym       [⚙]   │
│ 47 members · 31 active   │
│ ┌──────────────────────┐ │
│ │ 🔍 Search name/phone │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ Rahul S.   +91987…   │ │
│ │ Last workout: 2d ago │ │ ← from activity view
│ │           [Active ●] │ │
│ ├──────────────────────┤ │
│ │ Amit K.    +91876…   │ │
│ │ Last workout: 21d ago│ │ ← >14d = amber warning
│ │           [Active ●] │ │
│ └──────────────────────┘ │
│ [＋ Add member]          │ ← lime FAB/CTA
└──────────────────────────┘
```
Tap member → sheet: **Reset password** / **Deactivate** (confirm) / **Reactivate**.
Admin NEVER sees actual workout logs — only last-workout + weeks-logged aggregates.

## Screen 8 — Admin: Add Member

```
Step 1: [ Full name ] [ +91 Phone ] → [Create account]
Step 2 (success — shown ONCE):
┌──────────────────────────┐
│ ✅ Account created       │
│ Phone: +91 98765 43210   │
│ Password: k3m9p2xa       │
│ [📋 Copy] [🟢 WhatsApp]  │ ← share sheet prefilled msg
│ ⚠ Shown only once. Member│
│   sets own password on   │
│   first login.           │
└──────────────────────────┘
```
Errors: duplicate phone → "This number already has an account."

## Screen 9 — Super Admin: Dashboard

```
┌──────────────────────────┐
│ Platform          [⚙]   │
│ ┌──────┐┌──────┐┌──────┐ │
│ │  12  ││ 540  ││ 388  │ │ ← gyms / members / active-30d
│ └──────┘└──────┘└──────┘ │
│ GYMS                     │
│ ┌──────────────────────┐ │
│ │ FitZone · Ahmedabad  │ │
│ │ 47 members · 31 act. │ │
│ ├──────────────────────┤ │
│ │ IronHouse · Surat    │ │
│ │ 89 members · 60 act. │ │
│ └──────────────────────┘ │
│ [＋ Add gym]             │
└──────────────────────────┘
```
Tap gym → detail: stats, admin contact, **Deactivate gym** (confirm).

## Screen 10 — Super Admin: Add Gym

```
[ Gym name ] [ City ] [ Owner name ] [ Owner email ] → [Create]
Success (shown ONCE): owner email + temp password + [Copy]
```

---

## UX Rules

1. One-tap logging for members (Home CTA → today + current week).
2. Auto-save everywhere in Log view; number-pad keyboards only for weight/reps.
3. Tap targets ≥ 44pt; visible focus; dynamic type safe.
4. Empty states always instruct, never dead-end.
5. Sunday visually rest: dashed, dimmed, non-interactive.
6. Current week always visually distinct (lime chip).
7. Destructive actions confirm (delete exercise, deactivate member/gym).
8. Generated credentials are displayed exactly once, with Copy + WhatsApp share.
9. Role UIs are disjoint: members never see admin UI and vice versa; routing enforces it.
10. Deactivated members get a clear login message pointing them to their gym.
