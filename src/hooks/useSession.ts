import { useEffect, useState } from 'react';

import { getSession, onAuthStateChange, type Session } from '@/api/auth';

type SessionState = { session: Session | null; isLoading: boolean };

/**
 * The auth session, restored from expo-secure-store on cold start and kept in
 * sync with sign-in / sign-out / token refresh.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, isLoading: true });

  useEffect(() => {
    let active = true;

    getSession()
      .then((session) => {
        if (active) setState({ session, isLoading: false });
      })
      .catch(() => {
        // A corrupt/expired stored session just means "signed out".
        if (active) setState({ session: null, isLoading: false });
      });

    const unsubscribe = onAuthStateChange((session) => {
      if (active) setState({ session, isLoading: false });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
}
