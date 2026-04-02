'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/authFetch';

function isExpired(event) {
  if (!event) return false;

  // Check if event's end time has passed
  if (event.deadline && event.end_time) {
    const eventDateTime = new Date(`${event.deadline}T${event.end_time}`);
    if (new Date() > eventDateTime) return true;
  }

  // Fall back to deadline check without time
  if (event.deadline && !event.end_time) {
    return new Date(event.deadline) < new Date(new Date().toDateString());
  }

  return false;
}

function EventCard({ event, onClick }) {
  const expired = isExpired(event);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border bg-white dark:bg-zinc-900 p-5 flex flex-col gap-3 transition cursor-pointer group ${
        expired
          ? 'border-stone-200 dark:border-zinc-800'
          : 'border-teal-200 dark:border-teal-800/50 hover:border-teal-400 dark:hover:border-teal-700 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-zinc-950 dark:text-zinc-100 truncate group-hover:text-zinc-700 dark:group-hover:text-teal-300 transition">
              {event.name}
            </h2>
          </div>
          {event.event_date && (
            <div
              className={`${expired ? 'bg-red-50 dark:bg-red-900/20' : 'bg-teal-50 dark:bg-teal-900/20'} rounded-lg p-2.5 space-y-1 text-sm mt-3`}
            >
              <p
                className={`${expired ? 'text-red-700 dark:text-red-300' : 'text-teal-700 dark:text-teal-300'} font-semibold uppercase tracking-wide`}
              >
                イベント日時
              </p>
              <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                {new Date(event.event_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
                {' | '}
                {event.start_time}
              </div>
            </div>
          )}
          {event.deadline && (
            <div
              className={`${expired ? 'bg-red-50 dark:bg-red-900/20' : 'bg-teal-50 dark:bg-teal-900/20'} rounded-lg p-2.5 space-y-1 text-sm`}
            >
              <p
                className={`${expired ? 'text-red-700 dark:text-red-300' : 'text-teal-700 dark:text-teal-300'} font-semibold uppercase tracking-wide text-xs`}
              >
                終了日時
              </p>
              <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                {new Date(event.deadline).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
                {' | '}
                {event.end_time}
              </div>
            </div>
          )}
          {event.description && (
            <div
              className={`${expired ? 'bg-red-50 dark:bg-red-900/20' : 'bg-teal-50 dark:bg-teal-900/20'} rounded-lg p-2.5 space-y-1 text-sm`}
            >
              <p
                className={`${expired ? 'text-red-700 dark:text-red-300' : 'text-teal-700 dark:text-teal-300'} font-semibold uppercase tracking-wide text-xs`}
              >
                説明
              </p>
              <p className="text-zinc-800 dark:text-zinc-200 line-clamp-2">
                {event.description}
              </p>
            </div>
          )}
          {event.max_score && (
            <div
              className={`${expired ? 'bg-red-50 dark:bg-red-900/20' : 'bg-teal-50 dark:bg-teal-900/20'} rounded-lg p-2.5 space-y-1 text-sm`}
            >
              <p
                className={`${expired ? 'text-red-700 dark:text-red-300' : 'text-teal-700 dark:text-teal-300'} font-semibold uppercase tracking-wide text-xs`}
              >
                最高スコア
              </p>
              <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                {event.max_score} pts
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <span
          className={`text-sm font-semibold flex items-center gap-2 transition-all ${
            expired
              ? 'text-stone-700 dark:text-stone-200'
              : 'text-teal-700 dark:text-teal-300 group-hover:gap-3'
          }`}
        >
          {expired ? 'スコアを見る' : '採点を開始'}
          <svg
            className="w-4 h-4"
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
          <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center group-hover:bg-teal-200 dark:group-hover:bg-teal-900/60 transition">
            <svg
              className="w-4 h-4 text-teal-700 dark:text-teal-300"
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
              読み込み中…
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
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
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
              担当イベント
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-700 mt-0.5">
              イベントを選択して参加者の採点を開始してください。
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
              担当しているイベントはまだありません
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-700 mt-1.5 max-w-xs mx-auto">
              イベントが作成されると管理者から割り当てられます。
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                    アクティブ — {activeEvents.length}
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
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
                    終了 — {expiredEvents.length}
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
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
