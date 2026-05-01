'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import LiveTurnBanner from '@/components/LiveTurnBanner';
import LiveScoreboard from '@/components/LiveScoreboard';
import { authFetch } from '@/lib/authFetch';
import { useEventState } from '@/lib/useEventState';
import { useTranslation } from 'react-i18next';

function isExpired(event) {
  if (!event) return false;

  // Check if scoring deadline (deadline + end_time) has passed
  if (event.deadline && event.end_time) {
    const scoringDeadline = new Date(`${event.deadline}T${event.end_time}`);
    if (new Date() > scoringDeadline) return true;
  }

  // Fall back to deadline check without time
  if (event.deadline && !event.end_time) {
    return new Date(event.deadline) < new Date(new Date().toDateString());
  }

  return false;
}

function ScoreCard({
  participant,
  existingScore,
  eventId,
  onScored,
  disabled,
  maxScore,
  isCurrentTurn,
  turnToken,
}) {
  const { t } = useTranslation('common');
  const [value, setValue] = useState(existingScore?.score ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isScored = existingScore != null;
  const isDirty = String(value) !== String(existingScore?.score ?? '');
  const max = maxScore || 10;
  const effectiveDisabled = disabled || !isCurrentTurn;

  async function handleSubmit(e) {
    e.preventDefault();
    if (effectiveDisabled) return;
    if (!turnToken) {
      setError(t('noTurnInfo'));
      return;
    }
    if (value === '' || value === null) {
      setError(t('pleaseEnterScore'));
      return;
    }
    const num = Number(value);
    if (isNaN(num) || num < 1 || num > max) {
      setError(t('scoreRangeError', { max }));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/events/${eventId}/scores`, {
        method: 'POST',
        body: JSON.stringify({
          participant_id: participant.id,
          score: num,
          turn_token: turnToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('failedToSaveScore'));
        return;
      }
      onScored(participant.id, { participant_id: participant.id, score: num });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li
      className={`relative bg-white dark:bg-zinc-900 rounded-2xl border overflow-hidden transition-all duration-300 shadow-sm ${
        isScored && !isDirty
          ? 'border-emerald-200 dark:border-emerald-800/50 shadow-emerald-50 dark:shadow-none'
          : !effectiveDisabled
            ? 'border-teal-500 dark:border-teal-500 shadow-lg shadow-teal-500/10 scale-[1.02] z-10'
            : 'border-stone-200 dark:border-zinc-800'
      }`}
    >
      {/* Side accent */}
      <span
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
          isScored && !isDirty
            ? 'bg-emerald-400'
            : !effectiveDisabled
              ? 'bg-teal-500'
              : 'bg-zinc-300 dark:bg-zinc-700'
        }`}
      />

      {!effectiveDisabled && (
        <div className="absolute top-0 right-0 px-2 py-0.5 bg-teal-500 text-[9px] font-black text-white uppercase tracking-tighter rounded-bl-lg animate-pulse">
          {t('nowScoring')}
        </div>
      )}

      <div className="pl-4 pr-4 pt-4 pb-4 ml-1">
        {/* Participant name + scored badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                isScored && !isDirty
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : !effectiveDisabled
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
              }`}
            >
              {participant.name.charAt(0).toUpperCase()}
            </div>
            <p className={`font-semibold truncate text-sm ${!effectiveDisabled ? 'text-teal-900 dark:text-teal-100' : 'text-zinc-900 dark:text-zinc-100'}`}>
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
                disabled={effectiveDisabled}
                className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3 py-2 text-sm text-center font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={effectiveDisabled || submitting || value === ''}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                effectiveDisabled
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  : isScored && isDirty
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200 dark:shadow-none'
                    : isScored
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none'
                      : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200 dark:shadow-none'
              }`}
            >
              {effectiveDisabled
                ? isScored
                  ? t('scored')
                  : !isCurrentTurn
                    ? t('waiting')
                    : t('finished')
                : submitting
                  ? '…'
                  : isScored && isDirty
                    ? t('update')
                    : isScored
                      ? t('done')
                      : t('send')}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </form>
      </div>
    </li>
  );
}

/* ─── Participants Panel ─────────────────────────────────────────────────── */
function ParticipantsPanel({ participants, myScores, currentParticipantId, t }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm mb-8">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
        <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">
          {t('participantList')}
        </h3>
        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full border border-teal-100 dark:border-teal-900/30">
          {participants.length} {t('total')}
        </span>
      </div>
      <div className={`p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto custom-scrollbar ${participants.length > 10 ? 'max-h-[300px]' : ''}`}>
        {participants.map((p) => {
          const isCurrent = p.id === currentParticipantId;
          const score = myScores[p.id]?.score;
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                isCurrent
                  ? 'border-teal-500 bg-teal-500/5 ring-1 ring-teal-500/20'
                  : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
                    isCurrent
                      ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span
                  className={`text-sm font-semibold truncate ${
                    isCurrent
                      ? 'text-teal-900 dark:text-teal-100'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {p.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                )}
                {score != null ? (
                  <div className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      {score}
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                    {t('pending')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function JudgeScoringPage() {
  const { t } = useTranslation('common');
  const { id } = useParams();
  const router = useRouter();
  const { firebaseUser, supabaseUser, loading } = useAuth();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  // Map of participant_id → score object from DB
  const [myScores, setMyScores] = useState({});
  const [pageLoading, setPageLoading] = useState(true);
  const { state: liveState } = useEventState(id);

  const fetchScores = useCallback(async () => {
    const res = await authFetch(`/api/events/${id}/scores`);
    if (!res.ok) return;
    const data = await res.json();
    const map = {};
    (data.myScores || []).forEach((s) => {
      map[s.participant_id] = s;
    });
    setMyScores(map);
  }, [id]);

  const fetchData = useCallback(async () => {
    const [eventRes, participantsRes] = await Promise.all([
      authFetch(`/api/events/${id}`),
      authFetch(`/api/events/${id}/participants`),
    ]);

    if (eventRes.status === 401 || eventRes.status === 403) {
      router.replace('/signin');
      return;
    }

    if (!eventRes.ok) {
      router.replace('/judge');
      return;
    }

    const eventData = await eventRes.json();
    const participantsData = await participantsRes.json();

    setEvent(eventData.event);
    setParticipants(participantsData.participants || []);
    await fetchScores();
    setPageLoading(false);
  }, [id, router, fetchScores]);

  useEffect(() => {
    if (loading) return;

    // Attempt to fetch data regardless of firebaseUser because guest sessions
    // are valid too. The server returns 403 if the requester isn't an
    // assigned judge for this event, in which case fetchData redirects.
    fetchData();
  }, [loading, supabaseUser, fetchData, router]);

  // Refetch scores whenever the live turn moves on, so a judge sees their own
  // recorded score reflected and the leaderboard underneath stays current.
  useEffect(() => {
    if (!liveState?.turn_token) return;
    fetchScores();
  }, [liveState?.turn_token, fetchScores]);

  function handleScored(participantId, scoreObj) {
    setMyScores((prev) => ({ ...prev, [participantId]: scoreObj }));
  }

  const isMyTurn = liveState?.is_my_turn === true;
  const isInterlude = liveState?.status === 'interlude';
  const isActive = liveState?.status === 'active';
  const currentParticipantId = liveState?.current_participant_id ?? null;

  const scoredCount = Object.keys(myScores).length;
  const totalCount = participants.length;

  const currentParticipant = participants.find((p) => p.id === currentParticipantId);
  const otherParticipants = participants.filter((p) => p.id !== currentParticipantId);

  // Pulse the scoreboard right after the interlude ends, so judges notice the
  // standings have just shuffled.
  const [scoreboardPulse, setScoreboardPulse] = useState(0);
  const wasInterludeRef = useRef(false);
  useEffect(() => {
    if (wasInterludeRef.current && !isInterlude) {
      setScoreboardPulse((n) => n + 1);
    }
    wasInterludeRef.current = isInterlude;
  }, [isInterlude]);

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#f9f5ea]">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-teal-200 border-t-teal-600 animate-spin" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('loading')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#f9f5ea]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
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
          {t('backToEvents')}
        </button>

        {/* Event header */}
        <div className="mb-6 bg-white dark:bg-zinc-900 rounded-xl border border-teal-200 dark:border-teal-800/50 p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
                  {event?.name}
                </h1>
                {isExpired(event) && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                    {t('closed')}
                  </span>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {event?.event_date && (
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                    <p className="text-teal-700 dark:text-teal-300 font-semibold uppercase tracking-wide text-xs">
                      {t('eventDateTime')}
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
                {event?.deadline && event?.end_time && (
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                    <p className="text-teal-700 dark:text-teal-300 font-semibold uppercase tracking-wide text-xs">
                      {t('endTime')}
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
                {event?.description && (
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                    <p className="text-teal-700 dark:text-teal-300 font-semibold uppercase tracking-wide text-xs">
                      {t('description')}
                    </p>
                    <p className="text-zinc-800 dark:text-zinc-200">
                      {event.description}
                    </p>
                  </div>
                )}
                {event?.max_score && (
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                    <p className="text-teal-700 dark:text-teal-300 font-semibold uppercase tracking-wide text-xs">
                      {t('maxScore')}
                    </p>
                    <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                      {event.max_score} pts
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expired banner */}
        {isExpired(event) && (
          <div className="mb-6 bg-red-600 dark:bg-red-700 rounded-xl px-6 py-4 flex items-start gap-4 shadow-md">
            <svg
              className="w-5 h-5 text-white mt-0.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-white mb-1">
                {t('votingEnded')}
              </p>
              <p className="text-sm text-red-100">{t('votingEndedHelp')}</p>
            </div>
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
                  {t('progress')}
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
                  {t('allParticipantsScored')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Participants Panel */}
        {participants.length > 0 && (
          <div className="mb-6">
            <ParticipantsPanel
              participants={participants}
              myScores={myScores}
              currentParticipantId={currentParticipantId}
              t={t}
            />
          </div>
        )}

        {/* Live turn banner */}
        <div className="mb-2">
          <LiveTurnBanner eventId={id} state={liveState} />
        </div>

        {/* Debug info (only if needed, but helpful for now) */}
        <div className="mb-6 flex justify-end">
          <span className="text-[10px] text-zinc-400 font-mono">
            ID:{' '}
            {supabaseUser
              ? `user:${supabaseUser.id}`
              : liveState?.is_my_turn
                ? 'Matching Guest'
                : 'Guest'}
          </span>
        </div>

        {/* Active Participant / On Stage Section */}
        {isActive && currentParticipant && (
          <div className="mb-10 relative">
            <div className="absolute inset-0 bg-teal-500/5 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10">
              <div className="flex flex-col items-center gap-2 mb-6">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800/50">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400">
                    {t('currentlyOnStage')}
                  </h2>
                </div>
              </div>
              <div className="max-w-md mx-auto">
                <ScoreCard
                  key={currentParticipant.id}
                  participant={currentParticipant}
                  existingScore={myScores[currentParticipant.id] ?? null}
                  eventId={id}
                  onScored={handleScored}
                  disabled={isExpired(event)}
                  maxScore={event?.max_score ?? 10}
                  isCurrentTurn={isMyTurn}
                  turnToken={liveState?.turn_token ?? null}
                />
              </div>
            </div>
          </div>
        )}

        {/* Interlude — scoreboard is updating between participants */}
        {isInterlude && (
          <div className="mb-10 relative">
            <div className="absolute inset-0 bg-cyan-400/10 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10 max-w-md mx-auto rounded-3xl border-2 border-cyan-300 dark:border-cyan-500/60 bg-white dark:bg-zinc-900 px-6 py-8 text-center shadow-xl shadow-cyan-500/10">
              <div className="w-14 h-14 rounded-2xl bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-cyan-500 animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-1">
                {t('scoreboardUpdating')}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                {t('watchTheReveal')}
              </p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-cyan-600 dark:text-cyan-400 flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                {t('awaitingNextParticipant')}
              </p>
            </div>
          </div>
        )}

        {/* Live scoreboard — visible during active + interlude */}
        {(isActive || isInterlude || liveState?.status === 'ended') && (
          <div className="mb-8">
            <LiveScoreboard
              eventId={id}
              pulseSignal={scoreboardPulse}
              highlightParticipantId={isInterlude ? currentParticipantId : null}
            />
          </div>
        )}
      </main>
    </div>
  );
}
