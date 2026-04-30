'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { useCountdown } from '@/lib/useEventState';
import { useTranslation } from 'react-i18next';

// Resolves participant + judge ids to display names. Caches per eventId so
// repeat renders during a turn don't refetch.
function useRoster(eventId) {
  const { t } = useTranslation('common');
  const [roster, setRoster] = useState({ participants: {}, judges: {} });
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      const [pRes, jRes] = await Promise.all([
        authFetch(`/api/events/${eventId}/participants`),
        authFetch(`/api/events/${eventId}/judges`),
      ]);
      if (!pRes.ok || !jRes.ok) return;
      const pJson = await pRes.json();
      const jJson = await jRes.json();
      if (cancelled) return;
      const participants = {};
      (pJson.participants || []).forEach((p) => {
        participants[p.id] = p.name;
      });
      // Keys are tagged so they match state.current_judge_tag.
      const judges = {};
      (jJson.judges || []).forEach((j) => {
        judges[`user:${j.id}`] = j.name;
      });
      (jJson.guestJudges || []).forEach((g) => {
        judges[`guest:${g.id}`] = `${g.name} (${t('guest')})`;
      });
      setRoster({ participants, judges });
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, t]);
  return roster;
}

export default function LiveTurnBanner({
  eventId,
  state,
  onStart,
  startBusy,
}) {
  const { t } = useTranslation('common');
  const roster = useRoster(eventId);
  const seconds = useCountdown(state?.turn_expires_at_ms, state?.server_now_ms);

  if (!state) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
        {t('loadingLiveStatus')}
      </div>
    );
  }

  if (state.status === 'not_started') {
    return (
      <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
            {t('eventNotStarted')}
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
            {t('eventStartHelp')}
          </p>
        </div>
        {onStart && (
          <button
            onClick={onStart}
            disabled={startBusy}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-bold disabled:opacity-50 transition shadow"
          >
            {startBusy ? t('startingDot') : t('startEvent')}
          </button>
        )}
      </div>
    );
  }

  if (state.status === 'ended') {
    return (
      <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm">
        <p className="font-semibold text-zinc-800 dark:text-zinc-100">
          {t('eventEnded')}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
          {t('allParticipantsScored')}
        </p>
      </div>
    );
  }

  const participantName =
    roster.participants[state.current_participant_id] ??
    `#${state.current_participant_id}`;
  const judgeName =
    roster.judges[state.current_judge_tag] ?? `#${state.current_judge_id}`;
  const isMine = state.is_my_turn === true;

  return (
    <div
      className={`rounded-xl border-2 px-4 py-4 ${
        isMine
          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
          : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide font-semibold text-zinc-500 dark:text-zinc-400">
            {t('participantOnStage')}
          </p>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {participantName}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide font-semibold text-zinc-500 dark:text-zinc-400">
            {t('scoringInProgress')}
          </p>
          <p
            className={`text-lg font-bold truncate ${
              isMine
                ? 'text-teal-700 dark:text-teal-300'
                : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {isMine ? t('youWithName', { name: judgeName }) : judgeName}
          </p>
        </div>
        <div className="shrink-0 text-center">
          <p className="text-xs uppercase tracking-wide font-semibold text-zinc-500 dark:text-zinc-400">
            {t('remainingTime')}
          </p>
          <p
            className={`text-3xl font-mono font-bold tabular-nums ${
              seconds <= 10
                ? 'text-red-600 dark:text-red-400'
                : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {seconds}s
          </p>
        </div>
      </div>
    </div>
  );
}
