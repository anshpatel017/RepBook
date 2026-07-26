import type { Profile } from '@/api/profile';

/**
 * Where a given (session, profile) pair belongs. Mirrors the routing table in
 * docs/03-architecture.md §3 — this is the single source of truth for it.
 */
export type Destination =
  | '/login'
  | '/change-password'
  | '/plan-setup'
  | '/' //           member home, app/(tabs)/index.tsx
  | '/members' //    gym admin
  | '/dashboard'; // super admin

export function destinationFor(hasSession: boolean, profile: Profile | null): Destination {
  if (!hasSession || !profile) return '/login';
  if (!profile.is_active) return '/login'; // deactivated → back to their gym
  if (profile.must_change_password) return '/change-password'; // blocking, no escape
  switch (profile.role) {
    case 'gym_admin':
      return '/members';
    case 'super_admin':
      return '/dashboard';
    case 'member':
      return profile.onboarded ? '/' : '/plan-setup';
  }
}

/**
 * First route segments a destination tolerates. Anything else gets replaced,
 * which is what keeps the three role UIs disjoint (wireframes UX rule 9).
 */
export function allowedSegments(destination: Destination): readonly string[] {
  switch (destination) {
    case '/login':
      return ['(auth)'];
    case '/change-password':
      return ['change-password'];
    case '/plan-setup':
      return ['(onboarding)'];
    case '/':
      return ['(tabs)', 'day', 'log', 'settings'];
    case '/members':
      return ['(admin)', 'settings'];
    case '/dashboard':
      return ['(super)', 'settings'];
  }
}

export function needsRedirect(destination: Destination, segments: readonly string[]): boolean {
  const current = segments[0] ?? '(tabs)'; // "/" resolves inside the (tabs) group
  return !allowedSegments(destination).includes(current);
}
