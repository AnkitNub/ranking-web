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

function ScoreRow({ participant, existingScore, eventId, onScored, disabled }) {
  const [value, setValue] = useState(existingScore?.score ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isScored = existingScore != null;
  const isDirty = String(value) !== String(existingScore?.score ?? '');

  async function handleSubmit(e) {
    e.preventDefault();
    if (disabled) return;
    if (value === '' || value === null) {
      setError('Enter a score.');
      return;
    }
    const num = Number(value);
    if (isNaN(num) || num < 1 || num > 10) {
      setError('Score must be 1–10.');
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
    <li className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Name + status */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isScored && !isDirty && (
            <span
              className="text-emerald-500 dark:text-emerald-400 shrink-0"
              title="Scored"
            >
              <svg
                className="w-5 h-5"
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
            </span>
          )}
          <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {participant.name}
          </p>
          {isScored && !isDirty && (
            <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
              Your score:{' '}
              <strong className="text-zinc-600 dark:text-zinc-300">
                {existingScore.score}
              </strong>
            </span>
          )}
        </div>

        {/* Input + button */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 sm:gap-3"
        >
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={10}
              step={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="1–10"
              disabled={disabled}
              className="w-20 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-center text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={disabled || submitting || value === ''}
            className={
              'rounded-lg px-4 py-2 text-sm font-medium transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ' +
              (isScored && isDirty
                ? 'bg-amber-500 text-white'
                : isScored
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900')
            }
          >
            {disabled
              ? isScored
                ? '✓ Scored'
                : 'Closed'
              : submitting
                ? '…'
                : isScored && isDirty
                  ? 'Update Score'
                  : isScored
                    ? '✓ Scored'
                    : 'Submit Score'}
          </button>
        </form>
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
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
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/judge')}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition mb-2"
          >
            ← Back to Events
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {event?.name}
            </h1>
            {isExpired(event?.deadline) && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                Expired
              </span>
            )}
          </div>
          {event?.event_date && (
            <p className="text-sm text-zinc-400 mt-0.5">
              {new Date(event.event_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
          {event?.deadline && (
            <p
              className={`text-sm mt-0.5 font-medium ${
                isExpired(event.deadline)
                  ? 'text-red-500'
                  : 'text-amber-500 dark:text-amber-400'
              }`}
            >
              Scoring deadline:{' '}
              {new Date(event.deadline).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
          {event?.description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              {event.description}
            </p>
          )}
        </div>

        {/* Expired banner */}
        {isExpired(event?.deadline) && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <strong>Voting closed.</strong> The scoring deadline for this event
            has passed. Scores can no longer be submitted or updated.
          </div>
        )}

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mb-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Your progress
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {scoredCount}/{totalCount} scored
              </span>
            </div>
            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{
                  width: `${totalCount > 0 ? (scoredCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
            {scoredCount === totalCount && totalCount > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2">
                ✓ All participants scored!
              </p>
            )}
          </div>
        )}

        {/* Participant list */}
        {participants.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              No participants in this event yet.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {participants.map((p) => (
              <ScoreRow
                key={p.id}
                participant={p}
                existingScore={myScores[p.id] ?? null}
                eventId={id}
                onScored={handleScored}
                disabled={isExpired(event?.deadline)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
