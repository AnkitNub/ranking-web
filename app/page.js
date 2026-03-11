'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { firebaseUser, supabaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace('/signin');
      return;
    }
    if (supabaseUser?.role === 'admin') {
      router.replace('/admin');
    } else if (supabaseUser?.role === 'judge') {
      router.replace('/judge');
    }
    // If supabaseUser not yet loaded, wait for next render
  }, [loading, firebaseUser, supabaseUser, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <span className="text-sm text-zinc-400">Loading…</span>
    </div>
  );
}
