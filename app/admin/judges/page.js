'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/authFetch';

export default function ManageJudgesPage() {
  const { firebaseUser, supabaseUser, loading } = useAuth();
  const router = useRouter();
  const [judges, setJudges] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  const fetchJudges = useCallback(async () => {
    const res = await authFetch('/api/judges');
    const data = await res.json();
    setJudges(data.judges || []);
    setPageLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace('/signin');
      return;
    }
    if (supabaseUser && supabaseUser.role !== 'admin') {
      router.replace('/judge');
      return;
    }
    if (supabaseUser) fetchJudges();
  }, [loading, firebaseUser, supabaseUser, fetchJudges, router]);

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <span className="text-sm text-zinc-400">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Registered Judges
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            All users who have signed up as a judge. Assign them to events from
            the event management page.
          </p>
        </div>

        {judges.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              No judges registered yet.
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Judges appear here after they sign up and are synced to the
              system.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide hidden sm:table-cell">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {judges.map((judge, i) => (
                  <tr
                    key={judge.id}
                    className={`${i < judges.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">
                      {judge.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {judge.email}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 dark:text-zinc-500 text-xs hidden sm:table-cell">
                      {new Date(judge.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
