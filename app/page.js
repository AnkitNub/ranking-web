'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/authFetch';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation('common');
  const { firebaseUser, supabaseUser, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace('/signin');
      return;
    }
    if (!supabaseUser || redirecting) return;

    // Smart landing: if the user has hosted any events, send them to /host.
    // Otherwise, if they're assigned to judge events, send them to /judge.
    // Default fallback: /host so they see a "create your first event" prompt.
    setRedirecting(true);
    (async () => {
      try {
        const res = await authFetch('/api/events');
        const data = await res.json();
        const hosted = data.hosted ?? data.events ?? [];
        const judging = data.judging ?? [];
        if (hosted.length === 0 && judging.length > 0) {
          router.replace('/judge');
        } else {
          router.replace('/host');
        }
      } catch {
        router.replace('/host');
      }
    })();
  }, [loading, firebaseUser, supabaseUser, redirecting, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f5ea] dark:bg-[#f9f5ea]">
      <span className="text-sm text-zinc-400">{t('loading')}</span>
    </div>
  );
}
