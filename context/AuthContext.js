'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined); // undefined = loading
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [guestUser, setGuestUser] = useState(null);

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
        // If not a Firebase user, check if they are a guest
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
    });

    return () => unsubscribe();
  }, []);

  const loading = firebaseUser === undefined;

  return (
    <AuthContext.Provider
      value={{ firebaseUser, supabaseUser, guestUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
