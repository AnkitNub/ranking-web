'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/authFetch';

function isExpired(event) {
  if (!event) return false;

  // Check if event's end_time has passed
  if (event.event_date && event.end_time) {
    const eventDateTime = new Date(`${event.event_date}T${event.end_time}`);
    if (new Date() > eventDateTime) return true;
  }

  // Fall back to deadline check
  if (event.deadline) {
    return new Date(event.deadline) < new Date(new Date().toDateString());
  }

  return false;
}

function EventCard({ event, onClick }) {
  const expired = isExpired(event);
  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left rounded-2xl border bg-white dark:bg-zinc-900 p-5 pt-6 transition-all duration-200 shadow-sm hover:shadow-lg overflow-hidden ${
        expired
          ? 'border-stone-200 dark:border-zinc-800 opacity-80 hover:opacity-100'
          : 'border-teal-100 dark:border-teal-900/30 hover:border-teal-300 dark:hover:border-teal-800 hover:-translate-y-0.5'
      }`}
    >
      {/* Top accent stripe */}
      <span
        className={`absolute top-0 left-0 right-0 h-1.5 ${
          expired
            ? 'bg-zinc-300 dark:bg-zinc-700'
            : 'bg-linear-to-r from-teal-400 via-teal-500 to-teal-600'
        }`}
      />

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-zinc-950 dark:text-zinc-100 text-base leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-300 transition line-clamp-2 flex-1">
          {event.name}
        </p>
        {expired ? (
          <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
            Closed
          </span>
        ) : (
          <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
            Active
          </span>
        )}
      </div>

      {/* Dates */}
      <div className="mt-3 space-y-2">
        {event.event_date && (
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5 space-y-1">
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide">
              Event Time
            </p>
            <div className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <svg
                className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                {event.start_time && event.end_time && (
                  <div className="text-zinc-500 dark:text-zinc-400">
                    {event.start_time} - {event.end_time}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {event.deadline && (
          <div
            className={`${expired ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20'} rounded-lg p-2.5 space-y-1`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${expired ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}
            >
              Scoring Deadline
            </p>
            <div
              className={`flex items-start gap-2 text-xs font-medium ${expired ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300'}`}
            >
              <svg
                className={`w-3.5 h-3.5 shrink-0 mt-0.5`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div
                  className={`${expired ? 'text-red-700 dark:text-red-200' : 'text-amber-700 dark:text-amber-200'}`}
                >
                  {new Date(event.deadline).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                {!expired && (
                  <div className="text-xs opacity-75">
                    {Math.ceil(
                      (new Date(event.deadline) - new Date()) /
                        (1000 * 60 * 60 * 24),
                    )}{' '}
                    days left
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {event.description && (
          <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 mt-1 leading-relaxed">
            {event.description}
          </p>
        )}
      </div>

      {/* Footer CTA */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <span
          className={`text-xs font-semibold flex items-center gap-1 transition-all ${
            expired
              ? 'text-stone-600 dark:text-stone-300'
              : 'text-teal-700 dark:text-teal-300 group-hover:gap-2'
          }`}
        >
          {expired ? 'View scores' : 'Start scoring'}
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </span>
        {!expired && (
          <div className="w-6 h-6 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center group-hover:bg-teal-100 dark:group-hover:bg-teal-900/40 transition">
            <svg
              className="w-3 h-3 text-teal-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
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
      <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#f9f5ea]">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-teal-200 border-t-teal-600 animate-spin" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading events…
            </span>
          </div>
        </div>
      </div>
    );
  }

  const activeEvents = events.filter((e) => !isExpired(e));
  const expiredEvents = events.filter((e) => isExpired(e));

  return (
    <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#f9f5ea]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        {/* Page Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md shadow-teal-200 dark:shadow-teal-900/40">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-900 leading-tight">
              My Assigned Events
            </h1>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Select an event to start scoring participants.
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-teal-200 dark:border-zinc-800 rounded-2xl bg-white/60 dark:bg-zinc-900/40">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-7 h-7 text-teal-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-zinc-700 dark:text-zinc-200 font-semibold">
              No events assigned yet
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-700 mt-1.5 max-w-xs mx-auto">
              An admin will assign you to events once they&apos;re created.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                    Active — {activeEvents.length}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => router.push(`/judge/events/${event.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {expiredEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-700">
                    Closed — {expiredEvents.length}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {expiredEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => router.push(`/judge/events/${event.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
