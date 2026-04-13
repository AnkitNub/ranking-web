'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined); // undefined = loading
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [guestJudgeSession, setGuestJudgeSessionState] = useState(null);

  useEffect(() => {
    // Check for existing guest judge session in localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem('guestJudgeSession');
      if (storedSession) {
        try {
          setGuestJudgeSessionState(JSON.parse(storedSession));
        } catch (err) {
          console.error('Failed to parse guest judge session:', err);
        }
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
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
        }
      } else {
        setSupabaseUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const setGuestJudgeSession = (session) => {
    if (session) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('guestJudgeSession', JSON.stringify(session));
      }
      setGuestJudgeSessionState(session);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('guestJudgeSession');
      }
      setGuestJudgeSessionState(null);
    }
  };

  const clearGuestJudgeSession = () => {
    setGuestJudgeSession(null);
  };

  const loading = firebaseUser === undefined;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        supabaseUser,
        loading,
        guestJudgeSession,
        setGuestJudgeSession,
        clearGuestJudgeSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
