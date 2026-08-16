# RepBook — UI Design Brief

> **How to use this file:** paste the whole thing into a fresh Claude conversation
> and ask for a visual redesign. It describes the app as *built*, not as
> originally sketched, plus the constraints an implementation has to respect.
> Whatever comes back gets implemented in this repo, so specs must be concrete
> (numbers, not adjectives).

---

## 1. What the product is

**RepBook** — a week-over-week gym tracker sold to gyms (B2B2C). A gym buys it,
provisions accounts for its members, and members track their lifts.

Tagline: **"Beat last week."** That's the whole emotional proposition — the app
exists so someone standing at a bench knows what they lifted last Monday and
whether they beat it.

Three roles, three disjoint UIs in one app:

| Role | Who | Core screen |
|------|-----|-------------|
| `member` | Gym member, logs in with phone + password | Log screen (weights/reps per set) |
| `gym_admin` | Gym owner/staff | Members list |
| `super_admin` | The developer (platform owner) | Gyms dashboard |

**The one interaction that matters:** a member opens the app mid-workout, with
one hand, possibly sweaty, and taps once to reach today's log. Everything else is
secondary to that.

## 2. Hard constraints

These are not negotiable — a design that breaks them can't be implemented.

- **React Native (Expo SDK 54)**, styled with `StyleSheet.create`. No Tailwind,
  no NativeWind, no styled-components, no CSS. Flexbox only — no CSS grid, no
  `position: sticky`, no pseudo-elements, no box-shadow spread on Android.
- **Two font families only**, already bundled: `BarlowCondensed_600SemiBold`
  (display: numbers, headings) and `Inter` 400/500 (body). No new fonts.
- **Dark theme only, today.** The palette below is the entire vocabulary. If you
  need a new color, call it out explicitly as a proposal with a reason — don't
  slip extras in.
- **No icon library is installed.** Current icons are literal emoji/text glyphs:
  `⚙ ⌂ 📈 ✏️ 🗑 ✕ ＋ ‹ 🔍 🔥 😴 ▶ ✓`. Adding `@expo/vector-icons` is on the
  table — say so if your design depends on it.
- **Tap targets ≥ 44pt.** Inputs use numeric keyboards (`decimal-pad` for
  weight, `number-pad` for reps/phone).
- **Charts are victory-native (Skia).** Bars and lines are configurable; exotic
  chart types are not free.
- Screens must survive: OS font scaling, a 360×640 phone, and a keyboard
  covering the bottom half.

## 3. Current design tokens

```ts
// src/theme/tokens.ts — the complete current palette
export const colors = {
  bg:         '#101113',  // app background
  card:       '#191B1E',  // card surface
  card2:      '#212428',  // input / inset surface
  line:       '#2B2F34',  // borders, dividers
  text:       '#F2F3F4',  // primary text
  muted:      '#9AA0A6',  // secondary text
  dim:        '#6B7178',  // tertiary text, placeholders
  accent:     '#B5F04A',  // lime — the single accent
  accentDark: '#232A12',  // lime at 8% — selected pill backgrounds
  danger:     '#F07A6A',  // destructive + warnings
};

export const radius = { card: 14, input: 9, chip: 999 };
export const fonts  = { display: 'BarlowCondensed_600SemiBold',
                        body: 'Inter_400Regular', bodyMed: 'Inter_500Medium' };
export const space  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
```

Font sizes are currently ad hoc — 10, 11, 12, 13, 14, 15, 17, 18, 20, 21, 22,
24, 26, 30, 32, 52 all appear. **A real type scale is one of the deliverables.**

## 4. Component inventory

Everything below exists and is wired to real data. A redesign should mostly
restyle these rather than invent parallel components.

| Component | Used by | Current look |
|---|---|---|
| `Screen` + `LoadingState` / `ErrorState` / `EmptyState` | every screen | SafeAreaView, 16px horizontal padding; states are centered text + spinner |
| `Button` | everywhere | 3 variants: primary (solid lime, dark text), secondary (card2 + border), danger (transparent + red border) |
| `TextField` | forms | uppercase 12px label above, card2 field, optional static prefix (`+91`), red border + message on error |
| `Segmented` | login | pill track, selected segment = accentDark bg + lime text |
| `Picker` | charts | trigger pill "Day: Monday ▾" → bottom-sheet modal list with ✓ |
| `ConfirmDialog` | destructive actions | centered modal card, title + message + 2 stacked buttons |
| `ScreenHeader` | most screens | `‹` back glyph + display title + muted subtitle + optional right slot |
| `StatCard` | home, dashboard | big condensed number + tiny uppercase label |
| `DayGrid` | home | 2-column day cards + dashed Sunday rest card |
| `WeekChips` | day screen | horizontal pills, current week lime-outlined, `＋ New week` dashed |
| `ExerciseCard` | log | title + ✏️/🗑, PR chip, column labels, set rows, "＋ Add set" |
| `SetRow` | log | index, weight input, reps input, ✕ — plus a ghost line "last wk: 60 × 12" |
| `MemberRow` | admin | name, phone, activity line, Active/Inactive badge |
| `CredentialCard` | admin/super | lime-bordered card, identifier + password, Copy + WhatsApp |
| `ToggleRow` (`SwitchRow`, `ChoiceRow`) | settings | label + hint on the left, control on the right |
| `charts/ComparisonBars`, `charts/TrendLine` | charts | grouped bars (gray vs lime), line + dots |

## 5. Screens as built

### 5.1 Login
```
            REPBOOK              ← Barlow 52
        Beat last week.          ← lime 15
   ┌─[ Member ]─[ Admin ]──┐     ← segmented pill
   PHONE NUMBER                  ← uppercase 12 muted
   ┌ +91 │ 98765 43210 ────┐
   PASSWORD
   ┌───────────────────────┐
   [       Sign in        ]      ← solid lime
        Forgot password?         ← muted text button
```
States: field errors, auth errors in red, loading spinner in the button,
"Forgot password?" opens a bottom sheet explaining the gym resets it.

### 5.2 Forced password change
Blocking screen after first login. Title, one sentence of explanation, two
password fields, "Save & continue", "Sign out". No back navigation exists.

### 5.3 Plan setup (member first run)
Title "BUILD YOUR WEEK" → row of six day toggles (Mon–Sat) → dashed
"Sunday · Rest day 😴" card → "START FROM A TEMPLATE" (3 tappable cards) → one
card per selected day, each listing numbered exercises with ✕ and an
"Add exercise…" input → "Start tracking" CTA (disabled until ≥1 exercise).

### 5.4 Home (member) — **the most important screen**
```
REPBOOK                    ⚙
Saturday · Week 4
┌────────────────────────────┐
│ ▶ START SATURDAY'S WORKOUT │  ← solid lime block, dark text
│ Week 4                     │
└────────────────────────────┘
[  4  ] [ 156 ] [ 160 ]        ← weeks / sets / best kg
YOUR WEEK
[Monday      ] [Tuesday     ]  ← 2-col, today outlined lime
[Wednesday   ] [Thursday    ]     "2 exercises" / "No exercises"
[Friday      ] [Saturday    ]
[ Sunday · Rest day 😴 ]        ← dashed, non-interactive
```
On Sundays the CTA becomes a dashed "Rest day — recover well 😴" block.

### 5.5 Day → week picker
Header "Monday / Pick a week", horizontal chips `Week 1 ·✓` … `Week 4`
(current = lime outline) + `＋ New week`, then "THIS DAY'S PLAN" as a numbered
text list.

### 5.6 Log (member) — **the core loop**
```
‹ Monday
  Week 4
┌──────────────────────────────┐
│ Incline bench press    ✏️  🗑 │
│ 🔥 PR +2.5 kg                │  ← only when beating previous best
│  SET   WEIGHT (kg)   REPS    │
│   1    [  65  ]    [  12  ] ✕│
│        last wk: 60 × 12      │  ← ghost, toggleable in settings
│   2    [ 72.5 ]    [  10  ] ✕│
│        last wk: 70 × 10      │
│  ＋ Add set                   │
└──────────────────────────────┘
[ Add exercise…        ] [ Add ]
```
No save button anywhere: typing auto-saves after 500ms, plus on blur and on
leaving the screen. A completed set (weight + reps) fires a haptic tick.

### 5.7 Charts (member)
Header "PROGRESS / Beat last week", a Day picker, then Compare/With week
pickers. Card 1 "BEST SET PER EXERCISE": legend (gray = week A, lime = week B),
grouped bars, then a numbered key list `1. Deadlift 54 → 60 kg ▲6`. Card 2
"EXERCISE OVER TIME": exercise picker, "Week 1 → 3 · best set (kg)" with a ▲/▼
delta, and a lime line with dots.

### 5.8 Members (gym admin)
Gym name + "47 members · 31 active" + ⚙, a search field, then member rows
(name, phone, "Last workout: 2d ago · 3 weeks logged", Active badge; >14 days
inactive turns the activity line red). Lime "＋ Add member" pinned at the
bottom. Tapping a row opens a bottom sheet: Reset password / Deactivate /
Reactivate.

### 5.9 Add member / Add gym
Simple forms; on success the form is replaced by a `CredentialCard` — lime
border, identifier + password, `📋 Copy` and `🟢 WhatsApp`, and a warning that
it's shown only once.

### 5.10 Super admin dashboard
"PLATFORM", three totals (gyms / members / active-30d), then gym rows
(name · city, "47 members · 31 active", red "Suspended" pill if suspended).
Sheet: two stat cards, "GYM ADMIN LOGINS" with per-admin "Reset admin password",
a privacy note, and Deactivate/Reactivate gym.

### 5.11 Settings
Three cards — PROFILE (read-only rows), TRAINING (kg/lb choice, "Show last
week's numbers" switch), ACCOUNT ("Managed by FitZone Gym" + explanation) —
then "Sign out" and a version line.

## 6. Behaviour that must survive a redesign

1. Home → today's log in **one tap**.
2. **No save buttons** in the log screen; auto-save is invisible and must feel
   trustworthy without a "Saved!" toast.
3. **Sunday is never data.** It renders as a dashed, dimmed, non-interactive
   rest card everywhere.
4. The **current week** is always visually distinct.
5. **Generated credentials appear exactly once** and must look like something
   you copy immediately, not dismiss.
6. Gym admins **never** see weights or reps — only aggregates. Nothing in the
   admin UI should even imply otherwise.
7. Every destructive action confirms first.
8. Every screen needs loading, error and empty states, and empty states
   instruct ("Add your first exercise 👇") rather than dead-end.

## 7. Known weaknesses — what I actually want fixed

1. **Everything is a bordered card on near-black.** Little hierarchy between a
   critical CTA and a passive stat. Depth/emphasis currently comes only from
   border color.
2. **No type scale.** 16 different font sizes, chosen ad hoc.
3. **Contrast risk:** `dim (#6B7178)` on `bg (#101113)` is roughly 3.6:1 — below
   the 4.5:1 the requirements ask for. It's used for hints, ghost values and
   metadata. Needs a fix that doesn't wash out the hierarchy.
4. **Emoji icons** render differently per platform and look inconsistent next to
   condensed type.
5. **Log screen density** on a 360px phone: index + two inputs + ✕ + a ghost
   line per set gets cramped, and it's the screen used most.
6. **Charts feel bolted on** — tiny axis numbers, a text-heavy key list doing
   work the chart should do.
7. **No motion.** No transitions, no feedback beyond opacity-on-press.
8. **Sunday/rest, PR chips and the "Beat last week" idea** are stated in text but
   never celebrated visually. The app's one emotional beat is a PR, and it's
   currently a small chip.

## 8. Open decisions — please recommend

1. **Light theme.** The product spec asks for a theme toggle; only a dark
   palette exists. Worth it, or is dark-only the stronger identity for a gym app?
   If worth it, supply the full light palette mapped to the same token names.
2. **Warning color.** The spec wants amber for ">14 days inactive"; the palette
   has no amber, so it currently reuses `danger` red. Add an amber token, or
   solve it without color?
3. **Icons.** Keep emoji, or adopt `@expo/vector-icons` (adds a dependency but is
   already an Expo peer)?
4. **Density vs. reach** on the log screen: bigger inputs for gym use, or more
   sets visible at once?

## 9. What to deliver

Concrete enough to implement directly:

1. **Revised token file** — same names (`colors`, `radius`, `fonts`, `space`),
   plus a named type scale (e.g. `type.display1`, `type.body`, `type.label`) with
   exact size / lineHeight / letterSpacing / family per token.
2. **Component specs** — for each component in §4: padding, radii, borders,
   states (default / pressed / disabled / error / selected), and which type
   tokens it uses.
3. **Screen layouts** — for each screen in §5: order, spacing between blocks,
   and what dominates the visual hierarchy. ASCII or precise prose is fine;
   don't assume any layout capability RN doesn't have.
4. **Rationale, briefly** — especially where you deviate from what's built.
5. **A migration order** — which changes give the most improvement first, so it
   can land in stages rather than one risky sweep.

Please don't propose: new fonts, new dependencies beyond an icon set, gradients
that require extra libraries, or anything that assumes a web renderer.
