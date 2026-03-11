'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/authFetch';

function isExpired(deadline) {
  if (!deadline) return false;
  return new Date(deadline) < new Date(new Date().toDateString());
}

export default function JudgeDashboard() {
  const { firebaseUser, supabaseUser, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    const res = await authFetch('/api/events');
    const data = await res.json();
    setEvents(data.events || []);
    setPageLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace('/signin');
      return;
    }
    if (supabaseUser && supabaseUser.role === 'admin') {
      router.replace('/admin');
      return;
    }
    if (supabaseUser) fetchEvents();
  }, [loading, firebaseUser, supabaseUser, fetchEvents, router]);

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
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            My Assigned Events
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Tap an event to start scoring participants.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              No events assigned yet.
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              An admin will assign you to events once they&apos;re created.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => {
              const expired = isExpired(event.deadline);
              return (
                <li key={event.id}>
                  <button
                    onClick={() => router.push(`/judge/events/${event.id}`)}
                    className={`w-full text-left bg-white dark:bg-zinc-900 rounded-xl border px-5 py-4 transition group ${
                      expired
                        ? 'border-zinc-200 dark:border-zinc-800 opacity-70 hover:opacity-100'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition truncate">
                            {event.name}
                          </p>
                          {expired && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 shrink-0">
                              Expired
                            </span>
                          )}
                        </div>
                        {event.event_date && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {new Date(event.event_date).toLocaleDateString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              },
                            )}
                          </p>
                        )}
                        {event.deadline && (
                          <p
                            className={`text-xs mt-0.5 ${
                              expired
                                ? 'text-red-400'
                                : 'text-amber-500 dark:text-amber-400'
                            }`}
                          >
                            Deadline:{' '}
                            {new Date(event.deadline).toLocaleDateString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              },
                            )}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <svg
                        className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
