'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation('common');
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
    <div className="min-h-screen flex items-center justify-center bg-[#f9f5ea] dark:bg-[#f9f5ea]">
      <span className="text-sm text-zinc-400">{t('loading')}</span>
    </div>
  );
}
