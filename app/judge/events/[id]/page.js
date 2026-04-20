'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/authFetch';
import supabase from '@/lib/supabaseClient';
import {
  getRemainingRoundTime,
  formatSeconds,
  isVotingLocked,
} from '@/lib/eventHelpers';

function parseUTC(dateString) {
  if (!dateString) return new Date();
  return new Date(
    dateString +
      (dateString.includes('Z') || dateString.includes('+') ? '' : 'Z'),
  );
}

/**
 * Check if event is passed 24h from creation
 * Used for OLD mode to disable scoring after deadline
 */
function isExpired(event) {
  if (!event || !event.created_at) return false;

  const createdTime = parseUTC(event.created_at).getTime();
  const deadlineTime = createdTime + 24 * 60 * 60 * 1000;
  return Date.now() > deadlineTime;
}

// ============================================================================
// ScoreCard component - reusable for both NEW and OLD modes
// ============================================================================
/**
 * @param {Object} props
 * @param {Object} props.participant - Participant data { id, name, ... }
 * @param {Object|null} props.existingScore - Existing score { score, ... }
 * @param {string} props.eventId - Event ID
 * @param {Function} props.onScored - Callback when score is submitted
 * @param {boolean} props.disabled - Disable input when voting locked
 * @param {number} props.maxScore - Maximum allowed score
 */
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
      setError('スコアを入力してください。');
      return;
    }
    const num = Number(value);
    if (isNaN(num) || num < 1 || num > max) {
      setError(`スコアは1から${max}の間で入力してください。`);
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
        setError(data.error || 'スコアの保存に失敗しました。');
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
              : 'bg-gradient-to-b from-teal-400 to-teal-600'
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
        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          {max <= 20 ? (
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: max }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={disabled}
                  onClick={() => setValue(num)}
                  className={`w-12 h-12 flex-shrink-0 rounded-xl font-bold text-lg transition-all focus:outline-none ${
                    Number(value) === num
                      ? 'bg-teal-500 text-white shadow-lg ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-zinc-900 transform scale-110'
                      : 'bg-stone-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {num}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={max}
                step={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`1 – ${max}`}
                disabled={disabled}
                className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3 py-3 text-lg text-center font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={disabled || submitting || value === ''}
              className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
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
                  ? '✓ 採点済み'
                  : '終了'
                : submitting
                  ? '送信中...'
                  : isScored && isDirty
                    ? 'スコアを更新'
                    : isScored
                      ? '✓ 採点完了'
                      : 'スコアを送信'}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-500 font-medium text-center">
              {error}
            </p>
          )}
        </form>
      </div>
    </li>
  );
}

// ============================================================================
// CountdownTimer component - 60-second countdown with auto-update
// ============================================================================
/**
 * @param {Object} props
 * @param {Date} props.roundStartTime - When the round started
 * @param {number} props.roundDurationSeconds - Duration (default 60)
 */
function CountdownTimer({ roundStartTime, roundDurationSeconds = 60 }) {
  const [remaining, setRemaining] = useState(60);
  const [isLocked, setIsLocked] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    const updateTimer = () => {
      const rem = getRemainingRoundTime(roundStartTime, roundDurationSeconds);
      setRemaining(rem);
      setIsLocked(rem === 0);
    };

    // Update immediately
    updateTimer();

    // Then update every 100ms for smooth animation
    intervalRef.current = setInterval(updateTimer, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [roundStartTime, roundDurationSeconds]);

  const percentage = (remaining / roundDurationSeconds) * 100;
  const isWarning = remaining < 10;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Background circle */}
        <svg
          className="absolute inset-0 w-full h-full transform -rotate-90"
          viewBox="0 0 120 120"
        >
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-zinc-200 dark:text-zinc-700"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${(percentage / 100) * 339.3} 339.3`}
            className={`transition-all duration-100 ${
              isLocked
                ? 'text-red-500'
                : isWarning
                  ? 'text-amber-500'
                  : 'text-emerald-500'
            }`}
          />
        </svg>

        {/* Timer text */}
        <div className="text-center">
          <div
            className={`text-5xl font-bold tabular-nums ${
              isLocked
                ? 'text-red-600 dark:text-red-400'
                : isWarning
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatSeconds(remaining)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            秒
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1C5.9 1 1 5.9 1 12s4.9 11 11 11 11-4.9 11-11S18.1 1 12 1zm0 20c-4.9 0-9-4.1-9-9s4.1-9 9-9 9 4.1 9 9-4.1 9-9 9zm3.5-9c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5zm-7 0c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5zm3.5 6.5c2.3 0 4.3-1.4 5.4-3.4-.9.2-1.9.3-3 .3s-2.1-.1-3-.3c1.1 2 3.1 3.4 5.4 3.4z" />
            </svg>
            投票終了
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CurrentParticipantSection component - NEW mode (active status) display
// ============================================================================
/**
 * @param {Object} props
 * @param {Object} props.participant - Current participant
 * @param {Object|null} props.existingScore - Existing score
 * @param {string} props.eventId - Event ID
 * @param {Function} props.onScored - Score callback
 * @param {Date} props.roundStartTime - Round start time
 * @param {number} props.maxScore - Max score
 */
function CurrentParticipantSection({
  participant,
  existingScore,
  eventId,
  onScored,
  roundStartTime,
  maxScore,
}) {
  const votingLocked = isVotingLocked(roundStartTime, 60);

  return (
    <div className="mb-8 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-3xl border-2 border-emerald-200 dark:border-emerald-800/50 p-8 shadow-lg">
      {/* Current participant label */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-sm">
          ●
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
          現在の参加者
        </span>
      </div>

      {/* Two-column layout: participant info + timer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Participant info */}
        <div className="flex flex-col justify-center">
          <div className="mb-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mb-4"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
              }}
            >
              {participant.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              {participant.name}
            </h2>
            {existingScore && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  現在のスコア:
                </span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {existingScore.score}/{maxScore || 10}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Countdown timer */}
        <div className="flex justify-center">
          <CountdownTimer roundStartTime={roundStartTime} />
        </div>
      </div>

      {/* Score input for current participant */}
      {votingLocked ? (
        <div className="text-center p-6 bg-white/60 dark:bg-zinc-900/60 rounded-2xl border border-red-200 dark:border-red-800">
          <div className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
            投票終了
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            この参加者の投票期間は終了しました。次の参加者をお待ちください。
          </p>
        </div>
      ) : (
        <ScoreCard
          participant={participant}
          existingScore={existingScore}
          eventId={eventId}
          onScored={onScored}
          disabled={false}
          maxScore={maxScore}
        />
      )}
    </div>
  );
}

// ============================================================================
// PreviousScoresSection component - editable past participant scores
// ============================================================================
/**
 * @param {Object} props
 * @param {Array} props.previousParticipants - Past participants
 * @param {Object} props.myScores - Judge's scores
 * @param {string} props.eventId - Event ID
 * @param {Function} props.onScored - Score callback
 * @param {number} props.maxScore - Max score
 */
function PreviousScoresSection({
  previousParticipants,
  myScores,
  eventId,
  onScored,
  maxScore,
}) {
  if (previousParticipants.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-teal-500" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400">
          過去のスコア — {previousParticipants.length}
        </h3>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {previousParticipants.map((p) => (
          <ScoreCard
            key={p.id}
            participant={p}
            existingScore={myScores[p.id] ?? null}
            eventId={eventId}
            onScored={onScored}
            disabled={false}
            maxScore={maxScore}
          />
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Main JudgeScoringPage component
// ============================================================================
export default function JudgeScoringPage() {
  const { id } = useParams();
  const router = useRouter();
  const { firebaseUser, supabaseUser, guestJudgeSession, loading } = useAuth();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [myScores, setMyScores] = useState({});
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  // Determine mode: NEW if status is 'active', OLD otherwise
  const isNewMode = event?.status === 'active';

  // For NEW mode: current participant and previous ones
  const currentParticipant = isNewMode
    ? participants.find((p) => p.id === event?.current_participant_id)
    : null;
  const previousParticipants = isNewMode
    ? participants.filter((p) => p.id !== event?.current_participant_id)
    : [];

  // Fetch event, participants, and scores
  const fetchData = useCallback(async () => {
    try {
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
      setPageError(null);
      setPageLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setPageError('データの読み込みに失敗しました。');
      setPageLoading(false);
    }
  }, [id, router]);

  // Listen for realtime updates from Supabase
  useEffect(() => {
    if (!isNewMode) return;

    const channel = supabase
      .channel(`judge-sync-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${id}`,
        },
        async (payload) => {
          // If the event changed state, we might need a full refresh or just update the event object
          // To be safe and ensure all participants data syncs:
          if (payload.new) {
            setEvent(payload.new);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
          filter: `event_id=eq.${id}`,
        },
        async () => {
          // When ANY score for my event changes, fetch my new scores
          // (Alternatively we could fetch intelligently but fetching just scores is fine)
          try {
            const res = await authFetch(`/api/events/${id}/scores`);
            if (res.ok) {
              const data = await res.json();
              const scoresMap = {};
              (data.myScores || []).forEach((s) => {
                scoresMap[s.participant_id] = s;
              });
              setMyScores(scoresMap);
            }
          } catch (err) {}
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id, isNewMode]);

  // Initial load and auth check
  useEffect(() => {
    if (loading) return;
    if (!firebaseUser && !guestJudgeSession) {
      router.replace('/signin');
      return;
    }
    if (supabaseUser && supabaseUser.role === 'admin') {
      router.replace('/admin');
      return;
    }
    if (supabaseUser || guestJudgeSession) fetchData();
  }, [
    loading,
    firebaseUser,
    supabaseUser,
    guestJudgeSession,
    fetchData,
    router,
  ]);

  // Handle score submission
  function handleScored(participantId, scoreObj) {
    setMyScores((prev) => ({ ...prev, [participantId]: scoreObj }));
  }

  const scoredCount = Object.keys(myScores).length;
  const totalCount = participants.length;

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#1a1814]">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-teal-200 dark:border-teal-800 border-t-teal-600 dark:border-t-teal-400 animate-spin" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              読み込み中…
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#1a1814]">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
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
            イベント一覧に戻る
          </button>

          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-8">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4v2m0 -8a9 9 0 1 0 18 0 9 9 0 0 0 -18 0"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              エラーが発生しました
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">{pageError}</p>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              再度読み込み
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ========================================================================
  // NEW MODE: Real-time group judging with current participant focus
  // ========================================================================
  if (isNewMode) {
    // Event ended state
    if (event?.status === 'ended') {
      return (
        <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#1a1814]">
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
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
              イベント一覧に戻る
            </button>

            <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                イベント終了
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                このイベントの採点が完了しました。
              </p>
            </div>
          </main>
        </div>
      );
    }

    // Not yet started state (no current participant)
    if (!currentParticipant) {
      return (
        <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#1a1814]">
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
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
              イベント一覧に戻る
            </button>

            <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-8">
              <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-teal-600 dark:text-teal-400 animate-pulse"
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
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                イベント開始をお待ちください
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                ホストがイベントを開始するまで、こちらでお待ちください。
              </p>
            </div>
          </main>
        </div>
      );
    }

    // Active mode - show current participant with timer + previous scores
    return (
      <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#1a1814]">
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
            イベント一覧に戻る
          </button>

          {/* Event header */}
          <div className="mb-6 bg-white dark:bg-zinc-900 rounded-xl border border-teal-200 dark:border-teal-800/50 p-5 flex flex-col gap-3">
            <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
              {event?.name}
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {event?.max_score && (
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5">
                  <p className="text-teal-700 dark:text-teal-300 font-semibold text-xs uppercase">
                    最高スコア
                  </p>
                  <p className="text-zinc-800 dark:text-zinc-200 font-medium">
                    {event.max_score} pts
                  </p>
                </div>
              )}
              {totalCount > 0 && (
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5">
                  <p className="text-teal-700 dark:text-teal-300 font-semibold text-xs uppercase">
                    進捗
                  </p>
                  <p className="text-zinc-800 dark:text-zinc-200 font-medium">
                    {scoredCount} / {totalCount}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Current participant section */}
          <CurrentParticipantSection
            participant={currentParticipant}
            existingScore={myScores[currentParticipant.id] ?? null}
            eventId={id}
            onScored={handleScored}
            roundStartTime={event?.current_round_start_time}
            maxScore={event?.max_score ?? 10}
          />

          {/* Previous scores section */}
          <PreviousScoresSection
            previousParticipants={previousParticipants}
            myScores={myScores}
            eventId={id}
            onScored={handleScored}
            maxScore={event?.max_score ?? 10}
          />
        </main>
      </div>
    );
  }

  // ========================================================================
  // OLD MODE: Traditional all-participants-at-once view (status: null or not_started)
  // ========================================================================
  return (
    <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#1a1814]">
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
          イベント一覧に戻る
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
                    終了
                  </span>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {event?.created_at && (
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                    <p className="text-teal-700 dark:text-teal-300 font-semibold uppercase tracking-wide text-xs">
                      得点締め切り
                    </p>
                    <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                      {new Date(
                        parseUTC(event.created_at).getTime() +
                          24 * 60 * 60 * 1000,
                      ).toLocaleString('ja-JP')}
                    </div>
                  </div>
                )}
                {event?.description && (
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                    <p className="text-teal-700 dark:text-teal-300 font-semibold uppercase tracking-wide text-xs">
                      説明
                    </p>
                    <p className="text-zinc-800 dark:text-zinc-200">
                      {event.description}
                    </p>
                  </div>
                )}
                {event?.max_score && (
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                    <p className="text-teal-700 dark:text-teal-300 font-semibold uppercase tracking-wide text-xs">
                      最高スコア
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
              <p className="text-sm font-semibold text-white mb-1">投票終了</p>
              <p className="text-sm text-red-100">
                採点の締め切りを過ぎました。スコアを送信または更新することはできなくなりました。
              </p>
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
                    className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400"
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
                  進捗状況
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
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    : 'bg-gradient-to-r from-teal-400 to-teal-600'
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
                  すべての参加者を採点しました！
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
              参加者一覧 — {participants.length}
            </h2>
          </div>
        )}

        {/* Participant list */}
        {participants.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-teal-200 dark:border-zinc-700 rounded-2xl bg-white/60 dark:bg-zinc-900/40">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-teal-500 dark:text-teal-400"
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
              このイベントにはまだ参加者がいません。
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
                disabled={isExpired(event)}
                maxScore={event?.max_score ?? 10}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
