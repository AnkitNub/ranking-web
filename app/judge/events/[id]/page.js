'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/authFetch';

function isExpired(deadline) {
  if (!deadline) return false;
  return new Date(deadline) < new Date(new Date().toDateString());
}

function ScoreCard({
  participant,
  existingScore,
  eventId,
  onScored,
  disabled,
  maxScore,
}) {
  const [value, setValue] = useState(existingScore?.score ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isScored = existingScore != null;
  const isDirty = String(value) !== String(existingScore?.score ?? '');
  const max = maxScore || 10;

  async function handleSubmit(e) {
    e.preventDefault();
    if (disabled) return;
    if (value === '' || value === null) {
      setError('Enter a score.');
      return;
    }
    const num = Number(value);
    if (isNaN(num) || num < 1 || num > max) {
      setError(`Score must be 1–${max}.`);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/events/${eventId}/scores`, {
        method: 'POST',
        body: JSON.stringify({ participant_id: participant.id, score: num }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save score.');
        return;
      }
      onScored(participant.id, data.score);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li
      className={`relative bg-white dark:bg-zinc-900 rounded-2xl border overflow-hidden transition-all duration-200 shadow-sm ${
        isScored && !isDirty
          ? 'border-emerald-200 dark:border-emerald-800/50 shadow-emerald-50 dark:shadow-none'
          : disabled
            ? 'border-stone-200 dark:border-zinc-800'
            : 'border-teal-100 dark:border-zinc-700 hover:border-teal-200 dark:hover:border-teal-800/60 hover:shadow-md'
      }`}
    >
      {/* Side accent */}
      <span
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
          isScored && !isDirty
            ? 'bg-emerald-400'
            : disabled
              ? 'bg-zinc-300 dark:bg-zinc-700'
              : 'bg-linear-to-b from-teal-400 to-teal-600'
        }`}
      />

      <div className="pl-4 pr-4 pt-4 pb-4 ml-1">
        {/* Participant name + scored badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                isScored && !isDirty
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
              }`}
            >
              {participant.name.charAt(0).toUpperCase()}
            </div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-sm">
              {participant.name}
            </p>
          </div>
          {isScored && !isDirty && (
            <div className="shrink-0 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {existingScore.score}/{max}
            </div>
          )}
        </div>

        {/* Score input form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min={1}
                max={max}
                step={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`1 – ${max}`}
                disabled={disabled}
                className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3 py-2 text-sm text-center font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={disabled || submitting || value === ''}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                disabled
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  : isScored && isDirty
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200 dark:shadow-none'
                    : isScored
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none'
                      : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200 dark:shadow-none'
              }`}
            >
              {disabled
                ? isScored
                  ? '✓ Scored'
                  : 'Closed'
                : submitting
                  ? '…'
                  : isScored && isDirty
                    ? 'Update'
                    : isScored
                      ? '✓ Done'
                      : 'Submit'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </form>
      </div>
    </li>
  );
}

export default function JudgeScoringPage() {
  const { id } = useParams();
  const router = useRouter();
  const { firebaseUser, supabaseUser, loading } = useAuth();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  // Map of participant_id → score object from DB
  const [myScores, setMyScores] = useState({});
  const [pageLoading, setPageLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [eventRes, participantsRes, scoresRes] = await Promise.all([
      authFetch(`/api/events/${id}`),
      authFetch(`/api/events/${id}/participants`),
      authFetch(`/api/events/${id}/scores`),
    ]);

    if (!eventRes.ok) {
      router.replace('/judge');
      return;
    }

    const eventData = await eventRes.json();
    const participantsData = await participantsRes.json();
    const scoresData = await scoresRes.json();

    setEvent(eventData.event);
    setParticipants(participantsData.participants || []);

    const scoresMap = {};
    (scoresData.myScores || []).forEach((s) => {
      scoresMap[s.participant_id] = s;
    });
    setMyScores(scoresMap);
    setPageLoading(false);
  }, [id, router]);

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
    if (supabaseUser) fetchData();
  }, [loading, firebaseUser, supabaseUser, fetchData, router]);

  function handleScored(participantId, scoreObj) {
    setMyScores((prev) => ({ ...prev, [participantId]: scoreObj }));
  }

  const scoredCount = Object.keys(myScores).length;
  const totalCount = participants.length;

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#f9f5ea]">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-teal-200 border-t-teal-600 animate-spin" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading…
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#f9f5ea]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        {/* Back button */}
        <button
          onClick={() => router.push('/judge')}
          className="flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 transition mb-6 group"
        >
          <svg
            className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Events
        </button>

        {/* Event header */}
        <div className="mb-6 bg-white dark:bg-zinc-900 rounded-2xl border border-teal-100 dark:border-zinc-800 p-6 shadow-sm relative overflow-hidden">
          <span className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-teal-400 via-teal-500 to-teal-600 rounded-t-2xl" />
          <div className="flex items-start gap-4 mt-1">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md shadow-teal-200 dark:shadow-teal-900/40 shrink-0">
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
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {event?.name}
                </h1>
                {isExpired(event?.deadline) && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                    Closed
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {event?.event_date && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <svg
                      className="w-3.5 h-3.5"
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
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                )}
                {event?.deadline && (
                  <div
                    className={`flex items-center gap-1.5 text-xs font-medium ${isExpired(event.deadline) ? 'text-red-400' : 'text-amber-500 dark:text-amber-400'}`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
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
                    Deadline:{' '}
                    {new Date(event.deadline).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>
              {event?.description && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Expired banner */}
        {isExpired(event?.deadline) && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-3 flex items-start gap-3">
            <svg
              className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400">
              <strong>Voting closed.</strong> The scoring deadline has passed.
              Scores can no longer be submitted or updated.
            </p>
          </div>
        )}

        {/* Progress card */}
        {totalCount > 0 && (
          <div className="mb-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Your Progress
                </span>
              </div>
              <span className="text-sm font-bold text-teal-700 dark:text-teal-400">
                {scoredCount}/{totalCount}
              </span>
            </div>
            <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  scoredCount === totalCount
                    ? 'bg-linear-to-r from-emerald-400 to-emerald-500'
                    : 'bg-linear-to-r from-teal-400 to-teal-600'
                }`}
                style={{
                  width: `${totalCount > 0 ? (scoredCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
            {scoredCount === totalCount && totalCount > 0 && (
              <div className="flex items-center gap-1.5 mt-2.5">
                <svg
                  className="w-3.5 h-3.5 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  All participants scored!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Participants section header */}
        {participants.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400">
              Participants — {participants.length}
            </h2>
          </div>
        )}

        {/* Participant list */}
        {participants.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-teal-200 dark:border-zinc-800 rounded-2xl bg-white/60 dark:bg-zinc-900/40">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-teal-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 font-medium text-sm">
              No participants in this event yet.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {participants.map((p) => (
              <ScoreCard
                key={p.id}
                participant={p}
                existingScore={myScores[p.id] ?? null}
                eventId={id}
                onScored={handleScored}
                disabled={isExpired(event?.deadline)}
                maxScore={event?.max_score ?? 10}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
