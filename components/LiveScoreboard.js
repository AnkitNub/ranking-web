'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Polls /api/public/events/[id]/results and renders a compact, animated
// leaderboard. Used by the judge page (sidebar) so judges can follow standings
// while they wait for their turn.
//
// `pulseSignal` is a number that, when changed by the parent, triggers a
// brief "scoreboard updated" highlight — useful right after an interlude
// ends, when standings just shuffled.
export default function LiveScoreboard({
  eventId,
  pulseSignal = 0,
  highlightParticipantId = null,
  pollMs = 5000,
  compact = false,
}) {
  const { t } = useTranslation('common');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const previousRanksRef = useRef(new Map());

  useEffect(() => {
    let cancelled = false;
    let timer;

    const fetchOnce = async () => {
      try {
        const res = await fetch(`/api/public/events/${eventId}/results`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const loop = async () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(loop, pollMs * 2);
        return;
      }
      await fetchOnce();
      timer = setTimeout(loop, pollMs);
    };

    loop();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [eventId, pollMs]);

  const ranked = data?.ranked ?? [];
  const visible = ranked.filter((p) => p.judgesScored > 0);

  // Track rank changes to mark which entries moved up/down. Computed in an
  // effect (not during render) so we don't read or write the ref while
  // rendering.
  const [movementById, setMovementById] = useState({});
  useEffect(() => {
    const currentRanks = new Map(visible.map((p, i) => [p.id, i + 1]));
    if (previousRanksRef.current.size === 0) {
      previousRanksRef.current = currentRanks;
      return;
    }
    const next = {};
    currentRanks.forEach((rank, id) => {
      const prev = previousRanksRef.current.get(id);
      if (prev != null && prev !== rank) {
        next[id] = prev > rank ? 'up' : 'down';
      }
    });
    previousRanksRef.current = currentRanks;
    if (Object.keys(next).length > 0) {
      setMovementById(next);
      const t = setTimeout(() => setMovementById({}), 1200);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <p className="text-xs text-zinc-500">{t('loading')}</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 p-4">
        <p className="text-xs text-zinc-500 text-center">
          {t('scoresSoFar')}: 0
        </p>
      </div>
    );
  }

  const rowPad = compact ? 'px-3 py-2' : 'px-4 py-2.5';

  return (
    <div className="relative">
      <AnimatePresence>
        {pulseSignal > 0 && (
          <motion.div
            key={`pulse-${pulseSignal}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="absolute -inset-1 pointer-events-none rounded-2xl border-2 border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.4)] z-10"
          />
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
            {t('liveScoreboard')}
          </h3>
          <span className="text-[10px] font-mono text-zinc-400">
            {visible.length}/{ranked.length}
          </span>
        </div>

        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <AnimatePresence mode="popLayout">
            {visible.map((entry, idx) => {
              const rank = idx + 1;
              const move = movementById[entry.id];
              const isHighlight = highlightParticipantId === entry.id;
              return (
                <motion.li
                  key={entry.id}
                  layout
                  layoutId={`scoreboard-${entry.id}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex items-center gap-3 ${rowPad} ${
                    isHighlight
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400'
                      : rank === 1
                        ? 'bg-amber-50/50 dark:bg-amber-900/10'
                        : ''
                  }`}
                >
                  <span
                    className={`shrink-0 w-7 text-center font-bold text-sm tabular-nums ${
                      rank === 1
                        ? 'text-amber-500'
                        : rank === 2
                          ? 'text-zinc-400'
                          : rank === 3
                            ? 'text-amber-700'
                            : 'text-zinc-500'
                    }`}
                  >
                    {rank === 1
                      ? '🥇'
                      : rank === 2
                        ? '🥈'
                        : rank === 3
                          ? '🥉'
                          : rank}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">
                    {entry.name}
                  </span>
                  {move && (
                    <span
                      className={`text-xs font-bold ${
                        move === 'up' ? 'text-emerald-500' : 'text-rose-400'
                      }`}
                    >
                      {move === 'up' ? '▲' : '▼'}
                    </span>
                  )}
                  <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {entry.totalScore}
                  </span>
                  <span className="shrink-0 text-[10px] font-mono text-zinc-400">
                    {entry.judgesScored}/{data.assignedJudgesCount}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
