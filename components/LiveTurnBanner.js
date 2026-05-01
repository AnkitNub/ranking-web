'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
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
  onNext,
  nextBusy,
}) {
  const { t } = useTranslation('common');
  const roster = useRoster(eventId);

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

  if (state.status === 'interlude') {
    const justScoredName =
      roster.participants[state.current_participant_id] ??
      `#${state.current_participant_id}`;
    const isLastParticipant =
      state.participants_total != null &&
      state.current_participant_index >= state.participants_total - 1;
    return (
      <div className="rounded-2xl border-2 border-cyan-400 dark:border-cyan-500/70 bg-linear-to-br from-cyan-50 to-white dark:from-cyan-900/30 dark:to-zinc-900 px-6 py-5 shadow-lg shadow-cyan-500/10">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.15em] font-black text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              {t('scoreboardUpdating')}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xs font-semibold text-zinc-500">
                {t('justScored')}:
              </span>
              <p className="text-xl font-black text-zinc-950 dark:text-zinc-50 truncate">
                {justScoredName}
              </p>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
              {t('interludeHelp')}
            </p>
          </div>
        </div>
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
      className={`rounded-2xl border-2 px-6 py-5 transition-all duration-500 ${
        isMine
          ? 'border-teal-500 bg-linear-to-br from-teal-50 to-white dark:from-teal-900/40 dark:to-zinc-900 shadow-xl shadow-teal-500/10 scale-[1.01]'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.15em] font-black text-zinc-400 dark:text-zinc-500 mb-1">
            {t('participantOnStage')}
          </p>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${isMine ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
               {participantName.charAt(0).toUpperCase()}
            </div>
            <p className="text-xl font-black text-zinc-950 dark:text-zinc-50 truncate">
              {participantName}
            </p>
          </div>
        </div>
        
        <div className="min-w-0 flex-1 border-l border-zinc-100 dark:border-zinc-800 pl-6">
          <p className="text-[10px] uppercase tracking-[0.15em] font-black text-zinc-400 dark:text-zinc-500 mb-1">
            {t('scoringInProgress')}
          </p>
          <div className="flex items-center gap-2">
            {isMine && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
            )}
            <p
              className={`text-lg font-bold truncate ${
                isMine
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-zinc-600 dark:text-zinc-400 font-medium'
              }`}
            >
              {isMine ? t('allJudgesVoting') || 'Concurrent Voting' : judgeName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
