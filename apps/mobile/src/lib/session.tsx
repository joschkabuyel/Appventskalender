import type { Creator } from '@adventskalender/shared';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getProfile } from './api';
import { isConfigured } from './config';
import { ensureSession } from './supabase';

type SessionState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; userId: string; profile: Creator | null };

interface SessionContextValue {
  state: SessionState;
  setProfile: (profile: Creator) => void;
  retry: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  const load = useCallback(async () => {
    if (!isConfigured) {
      setState({
        status: 'error',
        message: 'Die App ist noch nicht eingerichtet. Bitte EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY und EXPO_PUBLIC_WEB_URL setzen.',
      });
      return;
    }
    setState({ status: 'loading' });
    try {
      const userId = await ensureSession();
      const profile = await getProfile();
      setState({ status: 'ready', userId, profile });
    } catch (error) {
      setState({ status: 'error', message: (error as Error).message || 'Verbindung fehlgeschlagen.' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setProfile = useCallback((profile: Creator) => {
    setState((current) => (current.status === 'ready' ? { ...current, profile } : current));
  }, []);

  return <SessionContext.Provider value={{ state, setProfile, retry: load }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession außerhalb von SessionProvider');
  return value;
}

/** Für Screens, die nur mit angemeldetem Ersteller erreichbar sind. */
export function useUserId(): string {
  const { state } = useSession();
  if (state.status !== 'ready') throw new Error('Keine Sitzung');
  return state.userId;
}
