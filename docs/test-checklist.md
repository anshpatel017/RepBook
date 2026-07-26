# RepBook — Manual Test Checklist

Run this against a **preview build on a real phone** before shipping to a pilot gym.
Everything here is behaviour the automated checks (`npm run typecheck`, `npm run lint`)
cannot prove.

You need three logins:

| Role | Login | Where it comes from |
|------|-------|---------------------|
| super_admin | your email | `supabase/bootstrap-super-admin.sql` |
| gym_admin | owner email from a gym you create | created in test 6.2 |
| member | phone from a member you create | created in test 5.2 |

---

## 0. Build & launch

- [ ] 0.1 `eas build --profile preview --platform android` (and/or `ios`) completes
- [ ] 0.2 Install on device; app opens to the dark login screen, no white flash
- [ ] 0.3 Wordmark renders in Barlow Condensed, tagline in lime — fonts loaded
- [ ] 0.4 Installed size under 40 MB (Android: Settings → Apps → RepBook)

## 1. Auth

- [ ] 1.1 Wrong password (Member tab) → "Phone or password incorrect."
- [ ] 1.2 Wrong password (Admin tab) → "Email or password incorrect."
- [ ] 1.3 Empty password → "Enter your password."
- [ ] 1.4 5-digit phone → "Enter a valid mobile number (10 digits)."
- [ ] 1.5 Airplane mode → sign in → "No internet connection…" (not a wrong-password message)
- [ ] 1.6 "Forgot password?" (Member) → sheet says to ask the gym
- [ ] 1.7 Correct login → lands on the screen for that role, never another role's screen
- [ ] 1.8 Force-quit and reopen → still signed in (session restored from SecureStore)
- [ ] 1.9 Sign out → login screen; reopening the app does not restore the session

## 2. Forced password change

- [ ] 2.1 New member's first login → change-password screen appears
- [ ] 2.2 Android back gesture / swipe-back cannot escape it
- [ ] 2.3 Password under 8 chars → "Use at least 8 characters."
- [ ] 2.4 Mismatched repeat → "Both passwords don't match."
- [ ] 2.5 Valid password → continues to plan setup (member) or the panel (admin)
- [ ] 2.6 Sign out, sign in with the OLD password → rejected
- [ ] 2.7 Sign in with the NEW password → works, and the change screen does not reappear

## 3. Plan setup (member first run)

- [ ] 3.1 Sunday is shown as a locked rest card, not a toggle
- [ ] 3.2 Tapping a template fills days + exercises
- [ ] 3.3 Manually add and remove an exercise on one day
- [ ] 3.4 "Start tracking" is disabled until at least one exercise exists
- [ ] 3.5 Finishing lands on Home; force-quit and reopen → Home, not plan setup again

## 4. Member core loop

- [ ] 4.1 Home shows today's name + current week; CTA says START <TODAY>'S WORKOUT
- [ ] 4.2 On a Sunday, the CTA is replaced by "Rest day — recover well"
- [ ] 4.3 CTA opens today's log in one tap
- [ ] 4.4 Weight field opens a decimal keypad; reps field a number keypad
- [ ] 4.5 Type a weight, wait ~1s, force-quit the app, reopen → the value is there
- [ ] 4.6 Type a weight then immediately navigate back → value still saved (unmount flush)
- [ ] 4.7 Completing a set (weight + reps) gives a haptic tick
- [ ] 4.8 Keyboard never covers the row being typed into
- [ ] 4.9 ＋ Add set adds a row; ✕ removes it
- [ ] 4.10 Rename an exercise → previously logged sets still listed under the new name
- [ ] 4.11 Delete an exercise → confirm dialog → gone from the plan
- [ ] 4.12 Add exercise from the bottom of the log screen → appears immediately
- [ ] 4.13 Airplane mode → type a weight → clear error, no silent data loss
- [ ] 4.14 Back online → retry succeeds (or re-type and it saves)
- [ ] 4.15 Empty day → "No exercises yet. Add your first one 👇"

## 5. Weeks

- [ ] 5.1 Day screen lists Week 1..current, current week outlined in lime
- [ ] 5.2 Weeks with data show `·✓`
- [ ] 5.3 ＋ New week creates the next week and opens it
- [ ] 5.4 Home's week number updates to match
- [ ] 5.5 Open a past week and edit a set → saves, does not touch the current week
- [ ] 5.6 In week ≥2, each set shows `last wk: <weight> × <reps>` under it
- [ ] 5.7 Beating your previous best shows the 🔥 PR chip on that exercise
- [ ] 5.8 Settings → "Show last week's numbers" off → ghosts and PR chips disappear

## 6. Charts

- [ ] 6.1 With <2 logged weeks → "Log a few weeks to see the trend."
- [ ] 6.2 With 2+ weeks → grouped bars, week A gray, week B lime
- [ ] 6.3 Changing either week picker updates the bars
- [ ] 6.4 Same week in both pickers → "Pick two different weeks"
- [ ] 6.5 A day with no exercises → "Nothing planned for this day"
- [ ] 6.6 Axis numbers are visible on both charts; no bar is clipped at the edges
- [ ] 6.7 Exercise picker changes the trend line
- [ ] 6.8 kg → lb in Settings changes every displayed number, and back again matches

## 7. Gym admin

- [ ] 7.1 Header shows the gym name and "N members · M active"
- [ ] 7.2 Search by name and by phone digits both filter
- [ ] 7.3 A member inactive >14 days is visually flagged
- [ ] 7.4 Add member → credentials shown ONCE; Copy puts them on the clipboard
- [ ] 7.5 WhatsApp button opens WhatsApp with the member's number and message prefilled
- [ ] 7.6 Leaving and reopening the screen does NOT show the password again
- [ ] 7.7 Adding a duplicate phone → "This number already has an account."
- [ ] 7.8 Log in as that new member on another device → works
- [ ] 7.9 Reset that member's password → new password shown once → old one rejected, new one works
- [ ] 7.10 Deactivate the member → their login says "Your account is inactive. Contact your gym."
- [ ] 7.11 Reactivate → login works again, history intact
- [ ] 7.12 Admin sees NO weights or reps anywhere in the panel

## 8. Super admin

- [ ] 8.1 Totals row matches the sum of the gym rows
- [ ] 8.2 Add gym → owner credentials shown once
- [ ] 8.3 That owner can log in, is forced to change password, sees only their gym
- [ ] 8.4 Reset admin password → email + new password shown once → it works
- [ ] 8.5 Deactivate gym → confirm → both its admin and its members are locked out
- [ ] 8.6 Reactivate gym → both can log in again
- [ ] 8.7 A member the gym had individually deactivated stays deactivated after reactivating the gym
- [ ] 8.8 Super admin sees member counts only — no member names or logins

## 9. Tenant isolation (run once per release)

- [ ] 9.1 `supabase/tests/rls-check.sql` → all 13 rows PASS
- [ ] 9.2 Gym A's admin cannot see Gym B's members in the app
- [ ] 9.3 A member cannot reach `/members` or `/dashboard` by any navigation

## 10. Offline & resilience

- [ ] 10.1 Load Home + a log screen, enable airplane mode, force-quit, reopen → cached data still shows
- [ ] 10.2 Offline writes show an error and do not corrupt displayed values
- [ ] 10.3 Reconnect → data reconciles with the server (no duplicate sets)
- [ ] 10.4 Rotate the device on the log screen → no crash, inputs keep their values

## 11. Accessibility & polish

- [ ] 11.1 Every tappable target is comfortably thumb-sized (≥44pt)
- [ ] 11.2 OS font size set to large → no clipped or overlapping text on Home and the log screen
- [ ] 11.3 Screen reader reads set rows as "Set 1 weight in kg" / "Set 1 reps"
- [ ] 11.4 No screen shows a bare spinner forever — loading, error and empty states all appear
- [ ] 11.5 Every destructive action asks for confirmation first

---

## Sign-off

| Item | Result |
|------|--------|
| Device / OS | |
| Build profile + version | |
| Tester | |
| Date | |
| Failures found | |
| Ship decision | |
