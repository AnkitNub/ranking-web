'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AuthContext = createContext(null);

// Read guest session synchronously from sessionStorage so the name is
// available on the very first render (no async wait needed).
function readGuestFromSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('guest_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.guest_judge_id || !session?.event_id) return null;
    return {
      id: session.guest_judge_id,
      event_id: session.event_id,
      name: session.name,
      role: 'guest_judge',
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined); // undefined = loading
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [supabaseLoading, setSupabaseLoading] = useState(true);
  // Initialise synchronously — avoids the flash before the async fetch returns
  const [guestUser, setGuestUser] = useState(() => readGuestFromSession());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        // Firebase user logged in — clear any stale guest session
        setGuestUser(null);
        setSupabaseLoading(true);
        try {
          const res = await fetch('/api/sync-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firebase_uid: user.uid,
              email: user.email,
              name: user.displayName ?? null,
            }),
          });

          if (res.ok) {
            const { user: dbUser } = await res.json();
            setSupabaseUser(dbUser);
          }
        } catch (err) {
          console.error('Failed to sync user to Supabase:', err);
        } finally {
          setSupabaseLoading(false);
        }
      } else {
        setSupabaseUser(null);
        setSupabaseLoading(false);

        // If sessionStorage already gave us the guest, we're done.
        // Only hit the network if sessionStorage was empty (e.g. hard refresh
        // where the httpOnly cookie still exists but sessionStorage was cleared).
        const syncGuest = readGuestFromSession();
        if (syncGuest) {
          setGuestUser(syncGuest);
        } else {
          fetch('/api/auth/me')
            .then((res) => res.json())
            .then((data) => {
              if (data.type === 'guest') {
                setGuestUser(data.user);
              } else {
                setGuestUser(null);
              }
            })
            .catch(() => setGuestUser(null));
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loading = firebaseUser === undefined || supabaseLoading;

  async function refreshAuth() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.type === 'guest') {
        setGuestUser(data.user);
      } else {
        setGuestUser(null);
      }
      if (data.type === 'authenticated') {
        setSupabaseUser(data.user);
      } else {
        setSupabaseUser(null);
      }
    } catch {
      setGuestUser(null);
      setSupabaseUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        supabaseUser,
        guestUser,
        loading,
        refreshAuth,
        setGuestUser,
        setSupabaseUser,
        setSupabaseLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
