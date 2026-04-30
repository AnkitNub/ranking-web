'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { playDrumroll, playVictoryFanfare } from '@/lib/sounds';
import { useEventState, useCountdown } from '@/lib/useEventState';

function LiveCountdown({ expiresAt, serverNow }) {
  const seconds = useCountdown(expiresAt, serverNow);
  return (
    <span className="text-7xl font-mono font-black tabular-nums">
      {seconds}s
    </span>
  );
}

/* ── Animated counter with roll-up + sound trigger ── */
function CountUp({ end, duration = 1.2 }) {
  const [displayValue, setDisplayValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    playDrumroll();

    const safeDuration = Math.max(duration, 0.1) * 1000;
    const startValue = 0;
    const endValue = Number(end) || 0;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / safeDuration, 1);

      // Ease-out curve for a game-show style reveal.
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (endValue - startValue) * eased;

      setDisplayValue(nextValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, duration]);

  const decimals = end % 1 === 0 ? 0 : 1;

  return <span className="tabular-nums">{displayValue.toFixed(decimals)}</span>;
}

function formatScore(value) {
  const num = Number(value) || 0;
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

/* ─── Confetti burst for the winner ───────────────────────────────────────── */
function Confetti() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParticles(
        Array.from({ length: 60 }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 1.5,
          duration: 2 + Math.random() * 2,
          color: [
            '#2dd4bf',
            '#f59e0b',
            '#a78bfa',
            '#f472b6',
            '#34d399',
            '#fbbf24',
          ][Math.floor(Math.random() * 6)],
          size: 6 + Math.random() * 8,
          isCircle: Math.random() > 0.5,
        })),
      );
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Top 3 card ───────────────────────────────────────────────────────── */
function Top3Card({
  entry,
  rank,
  isNew,
  movement,
  isPlacementFocus,
  isMuted,
  placementSignal,
}) {
  const { t } = useTranslation('common');
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
  const borderColor =
    rank === 1
      ? 'border-amber-400/60'
      : rank === 2
        ? 'border-zinc-400/40'
        : 'border-amber-700/40';
  const bgGradient =
    rank === 1
      ? 'from-amber-950/80 to-stone-900/90'
      : rank === 2
        ? 'from-zinc-800/80 to-stone-900/90'
        : 'from-amber-950/60 to-stone-900/90';
  const shadowColor =
    rank === 1
      ? 'shadow-amber-500/30'
      : rank === 2
        ? 'shadow-zinc-500/20'
        : 'shadow-amber-800/20';
  const accentGradient =
    rank === 1
      ? 'from-amber-300 to-amber-500'
      : rank === 2
        ? 'from-zinc-300 to-zinc-500'
        : 'from-amber-600 to-amber-800';
  const scoreText =
    rank === 1
      ? 'text-amber-300'
      : rank === 2
        ? 'text-zinc-200'
        : 'text-amber-400';
  const nameText =
    rank === 1
      ? 'text-amber-100'
      : rank === 2
        ? 'text-zinc-100'
        : 'text-amber-200';
  const isMovingDown = movement?.direction === 'down';
  const isMovingUp = movement?.direction === 'up';
  const moveDistance = movement?.distance || 0;
  const motionDelay = movement ? Math.min((moveDistance - 1) * 0.07, 0.24) : 0;
  const downImpactOpacity = Math.min(0.22 + moveDistance * 0.08, 0.5);
  const upImpactOpacity = Math.min(0.18 + moveDistance * 0.06, 0.4);

  return (
    <motion.div
      layoutId={`card-${entry.id}`}
      initial={{ opacity: 0, x: -30, scale: 0.95 }}
      animate={
        isMovingDown
          ? {
              opacity: 1,
              x: [0, -14, 10, -8, 4, 0],
              y: [0, 12, -2, 0],
              scale: [1, 1.03, 0.995, 1],
              rotate: [0, -1.8, 1.4, -0.8, 0],
              filter: [
                'brightness(1)',
                'brightness(1.2)',
                'brightness(0.98)',
                'brightness(1)',
              ],
            }
          : isMovingUp
            ? {
                opacity: 1,
                x: [0, 2, -2, 0],
                y: [0, -14, 2, 0],
                scale: [1, 1.045, 0.998, 1],
                rotate: [0, -0.9, 0.4, 0],
                filter: ['brightness(1)', 'brightness(1.14)', 'brightness(1)'],
              }
            : {
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
                rotate: 0,
                filter: 'brightness(1)',
              }
      }
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={
        movement
          ? {
              duration: 0.82,
              ease: [0.22, 1, 0.36, 1],
              delay: motionDelay,
            }
          : { duration: 0.5, type: 'spring', bounce: 0.2 }
      }
      className="flex w-full mb-3 relative"
      style={{ zIndex: isPlacementFocus ? 30 : isNew || movement ? 20 : 1 }}
    >
      <div
        className={`relative overflow-hidden w-full rounded-2xl border ${borderColor} bg-gradient-to-r ${bgGradient} shadow-xl ${shadowColor} flex items-center px-6 py-5 transition-all duration-300 ${
          isMuted ? 'opacity-45 saturate-75 scale-[0.985]' : 'opacity-100'
        }`}
      >
        {isPlacementFocus && (
          <motion.div
            key={`top3-placement-focus-${placementSignal}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.94, 1.045, 1] }}
            transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -inset-[2px] pointer-events-none rounded-2xl border border-cyan-300/75 shadow-[0_0_30px_rgba(34,211,238,0.55)] z-20"
          />
        )}

        {isPlacementFocus && (
          <motion.div
            key={`top3-placement-sweep-${placementSignal}`}
            initial={{ opacity: 0, x: '-120%', skewX: -14 }}
            animate={{ opacity: [0, 0.65, 0], x: '140%' }}
            transition={{
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.08,
            }}
            className="absolute inset-y-0 -left-10 w-20 pointer-events-none bg-gradient-to-r from-cyan-300/0 via-cyan-200/80 to-cyan-300/0 blur-[2px] z-20"
          />
        )}

        {isPlacementFocus && (
          <motion.div
            key={`top3-placement-orbit-${placementSignal}`}
            initial={{ opacity: 0.7, scale: 0.9 }}
            animate={{ opacity: [0.7, 0], scale: [0.9, 1.08] }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.06 }}
            className="absolute -inset-1 pointer-events-none rounded-2xl border border-cyan-300/65 z-10"
          />
        )}

        {movement && (
          <motion.div
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              opacity: [
                0,
                isMovingDown ? downImpactOpacity : upImpactOpacity,
                0,
              ],
              scale: [1, 1.06, 1],
            }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: motionDelay }}
            className={`absolute inset-0 pointer-events-none z-0 ${
              isMovingDown ? 'bg-rose-400/30' : 'bg-emerald-400/28'
            }`}
          />
        )}

        {movement && (
          <motion.div
            initial={{ opacity: 0, x: 0 }}
            animate={
              isMovingDown
                ? { opacity: [0, 0.45, 0], x: [18, -20], scaleY: [1, 1.12, 1] }
                : { opacity: [0, 0.38, 0], x: [-18, 20], scaleY: [1, 1.1, 1] }
            }
            transition={{ duration: 0.65, ease: 'easeOut', delay: motionDelay }}
            className={`absolute inset-y-0 left-0 right-0 pointer-events-none z-0 blur-sm ${
              isMovingDown
                ? 'bg-gradient-to-r from-rose-500/0 via-rose-400/30 to-rose-500/0'
                : 'bg-gradient-to-r from-emerald-500/0 via-emerald-400/28 to-emerald-500/0'
            }`}
          />
        )}

        {isNew && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              repeatDelay: 0.5,
            }}
            className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
          />
        )}

        {/* Accent bar at left */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accentGradient}`}
        />

        {/* Medal */}
        <div className="text-5xl mr-6 drop-shadow-md z-10">{medal}</div>

        {/* Name */}
        <div className="flex-1 min-w-0 z-10">
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80 transition-colors"
            style={{
              color:
                rank === 1 ? '#fbbf24' : rank === 2 ? '#a1a1aa' : '#b45309',
            }}
          >
            {t('rank', { rank })}
          </p>
          <p
            className={`font-black truncate transition-all duration-500 ${nameText} ${
              rank === 1 ? 'text-3xl lg:text-4xl' : 'text-2xl lg:text-3xl'
            }`}
          >
            {entry.name}
          </p>
        </div>

        {/* Score */}
        <div className="text-right shrink-0 ml-4 flex flex-col items-end z-10">
          <p
            className={`font-black tabular-nums transition-all duration-500 ${
              rank === 1 ? 'text-5xl' : 'text-4xl'
            } ${scoreText} drop-shadow-sm`}
          >
            {formatScore(entry.totalScore)}
          </p>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mt-1">
            pt
          </p>
        </div>

        {/* Subtle sliding indicator for new entry instead of big badge */}
        {isNew && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
          />
        )}
      </div>
    </motion.div>
  );
}

/* ─── Rest list card ────────────────────────────────────────────────────────── */
function RestListCard({
  entry,
  rank,
  isNew,
  movement,
  isPlacementFocus,
  isMuted,
  placementSignal,
}) {
  const { t } = useTranslation('common');
  const isMovingDown = movement?.direction === 'down';
  const isMovingUp = movement?.direction === 'up';
  const moveDistance = movement?.distance || 0;
  const motionDelay = movement ? Math.min((moveDistance - 1) * 0.06, 0.22) : 0;
  const downImpactOpacity = Math.min(0.18 + moveDistance * 0.07, 0.42);
  const upImpactOpacity = Math.min(0.14 + moveDistance * 0.06, 0.34);

  return (
    <motion.div
      layoutId={`card-${entry.id}`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={
        isMovingDown
          ? {
              opacity: 1,
              x: [0, -12, 9, -6, 2, 0],
              y: [0, 10, -2, 0],
              scale: [1, 1.025, 0.998, 1],
              rotate: [0, -1.1, 0.9, -0.4, 0],
              filter: [
                'brightness(1)',
                'brightness(1.16)',
                'brightness(0.99)',
                'brightness(1)',
              ],
            }
          : isMovingUp
            ? {
                opacity: 1,
                x: [0, 2, -2, 0],
                y: [0, -10, 1, 0],
                scale: [1, 1.032, 0.998, 1],
                rotate: [0, -0.7, 0.3, 0],
                filter: ['brightness(1)', 'brightness(1.11)', 'brightness(1)'],
              }
            : {
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
                rotate: 0,
                filter: 'brightness(1)',
              }
      }
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={
        movement
          ? {
              duration: 0.76,
              ease: [0.22, 1, 0.36, 1],
              delay: motionDelay,
            }
          : { duration: 0.5, type: 'spring', bounce: 0.2 }
      }
      className="flex flex-col justify-center mb-2 shrink-0 relative"
      style={{ zIndex: isPlacementFocus ? 30 : isNew || movement ? 20 : 1 }}
    >
      <div
        className={`relative overflow-hidden rounded-xl border border-zinc-700/40 bg-zinc-900/50 hover:bg-zinc-900/70 px-4 py-3 flex items-center gap-4 transition shadow-sm duration-300 ${
          isMuted ? 'opacity-45 saturate-75 scale-[0.988]' : 'opacity-100'
        }`}
      >
        {isPlacementFocus && (
          <motion.div
            key={`rest-placement-focus-${placementSignal}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: [0, 0.74, 0], scale: [0.95, 1.04, 1] }}
            transition={{ duration: 0.98, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -inset-[2px] pointer-events-none rounded-xl border border-cyan-300/70 shadow-[0_0_26px_rgba(34,211,238,0.45)] z-20"
          />
        )}

        {isPlacementFocus && (
          <motion.div
            key={`rest-placement-sweep-${placementSignal}`}
            initial={{ opacity: 0, x: '-125%', skewX: -16 }}
            animate={{ opacity: [0, 0.56, 0], x: '145%' }}
            transition={{
              duration: 0.82,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.06,
            }}
            className="absolute inset-y-0 -left-8 w-14 pointer-events-none bg-gradient-to-r from-cyan-300/0 via-cyan-200/75 to-cyan-300/0 blur-[1px] z-20"
          />
        )}

        {isPlacementFocus && (
          <motion.div
            key={`rest-placement-orbit-${placementSignal}`}
            initial={{ opacity: 0.62, scale: 0.9 }}
            animate={{ opacity: [0.62, 0], scale: [0.9, 1.08] }}
            transition={{ duration: 0.74, ease: 'easeOut', delay: 0.04 }}
            className="absolute -inset-[2px] pointer-events-none rounded-xl border border-cyan-300/60 z-10"
          />
        )}

        {movement && (
          <motion.div
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              opacity: [
                0,
                isMovingDown ? downImpactOpacity : upImpactOpacity,
                0,
              ],
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 0.64, ease: 'easeOut', delay: motionDelay }}
            className={`absolute inset-0 pointer-events-none z-0 ${
              isMovingDown ? 'bg-rose-400/28' : 'bg-emerald-400/24'
            }`}
          />
        )}

        {movement && (
          <motion.div
            initial={{ opacity: 0, x: 0 }}
            animate={
              isMovingDown
                ? { opacity: [0, 0.33, 0], x: [14, -16], scaleY: [1, 1.08, 1] }
                : { opacity: [0, 0.3, 0], x: [-14, 16], scaleY: [1, 1.08, 1] }
            }
            transition={{ duration: 0.58, ease: 'easeOut', delay: motionDelay }}
            className={`absolute inset-y-0 left-0 right-0 pointer-events-none z-0 blur-sm ${
              isMovingDown
                ? 'bg-gradient-to-r from-rose-500/0 via-rose-400/24 to-rose-500/0'
                : 'bg-gradient-to-r from-emerald-500/0 via-emerald-400/20 to-emerald-500/0'
            }`}
          />
        )}

        {/* Shimmer/Swipe effect */}
        {isNew && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              repeatDelay: 0.5,
            }}
            className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
          />
        )}

        {/* Subtle sliding indicator for new entry instead of big badge */}
        {isNew && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
          />
        )}

        {/* Rank number */}
        <div
          className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center z-10 ${
            isNew
              ? 'bg-emerald-900/60 text-emerald-400'
              : 'bg-zinc-800 text-zinc-400'
          } font-bold text-sm`}
        >
          {rank}
        </div>

        {/* Name + score */}
        <div className="flex-1 min-w-0 z-10">
          <p
            className={`font-semibold ${
              isNew ? 'text-emerald-100' : 'text-zinc-200'
            } text-sm`}
          >
            {entry.name}
          </p>
        </div>

        {/* Score */}
        <div className="text-right shrink-0 z-10">
          <p
            className={`font-bold ${
              isNew ? 'text-emerald-300' : 'text-zinc-300'
            } text-lg tabular-nums`}
          >
            {formatScore(entry.totalScore)}
          </p>
          <p
            className={`text-xs ${
              isNew ? 'text-emerald-600' : 'text-zinc-600'
            }`}
          >
            pt
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main presentation page ───────────────────────────────────────────────── */
export default function PresentationPage() {
  const { t } = useTranslation('common');
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [started, setStarted] = useState(false);

  // Mode: 'manual' | 'auto'
  const [mode, setMode] = useState('manual');
  // Auto speed in ms
  const [autoSpeed, setAutoSpeed] = useState(2000);

  const [showConfetti, setShowConfetti] = useState(false);
  const [rankMotionById, setRankMotionById] = useState({});
  const [leaderboardShockwave, setLeaderboardShockwave] = useState(false);
  const [leaderboardStagePunchSignal, setLeaderboardStagePunchSignal] =
    useState(0);
  const [leaderboardPlacementFlash, setLeaderboardPlacementFlash] =
    useState(false);
  const { state: liveState } = useEventState(id);
  const [placementFocus, setPlacementFocus] = useState({ id: null, signal: 0 });
  const previousRanksRef = useRef(new Map());
  const previousPhaseRef = useRef('intro');

  // Phase: 'intro' | 'breakdown' | 'leaderboard'
  const [phase, setPhase] = useState('intro');
  const [breakdownPIndex, setBreakdownPIndex] = useState(0);
  const [breakdownJIndex, setBreakdownJIndex] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/events/${id}/results`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || t('failedToLoadResults'));
        return;
      }
      setData(json);
    } catch {
      setError(t('networkErrorRetry'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh while not all scores are in. Once the event is fully scored,
  // the dramatic reveal takes over and we stop polling so the show isn't
  // disturbed by network jitter.
  useEffect(() => {
    if (data?.allScored) return undefined;
    if (started) return undefined;
    if (typeof document !== 'undefined' && document.hidden) return undefined;
    const id = setInterval(fetchData, 2500);
    return () => clearInterval(id);
  }, [data?.allScored, started, fetchData]);

  const breakdownOrder = useMemo(
    () =>
      data?.ranked
        ? [...data.ranked].sort((a, b) => a.originalIndex - b.originalIndex)
        : [],
    [data],
  );

  // The actually visible list of users on the leaderboard,
  // keeping their correctly sorted final ranking
  const currentlyRevealed = useMemo(() => {
    if (!data?.ranked || breakdownOrder.length === 0) return [];

    // In breakdown phase, we don't display the current participant on the
    // leaderboard yet until we transition to the leaderboard phase.
    const maxIndex =
      phase === 'leaderboard' ? breakdownPIndex : breakdownPIndex - 1;

    const revealedIds = new Set(
      breakdownOrder.slice(0, maxIndex + 1).map((p) => p.id),
    );
    return data.ranked.filter((p) => revealedIds.has(p.id));
  }, [breakdownOrder, phase, breakdownPIndex, data]);

  const total = breakdownOrder.length;
  const allRevealed = phase === 'leaderboard' && breakdownPIndex >= total - 1;
  const placementTargetRank = useMemo(() => {
    if (!placementFocus.id) return null;

    const index = currentlyRevealed.findIndex(
      (p) => p.id === placementFocus.id,
    );
    return index === -1 ? null : index + 1;
  }, [currentlyRevealed, placementFocus.id]);

  useEffect(() => {
    const prevPhase = previousPhaseRef.current;

    if (phase === 'leaderboard' && prevPhase !== 'leaderboard') {
      const placedId = breakdownOrder[breakdownPIndex]?.id;

      if (placedId) {
        setPlacementFocus((prev) => ({
          id: placedId,
          signal: prev.signal + 1,
        }));
        setLeaderboardPlacementFlash(true);
        setLeaderboardStagePunchSignal((prev) => prev + 1);

        const clearFocusTimer = setTimeout(() => {
          setPlacementFocus((prev) =>
            prev.id === placedId ? { ...prev, id: null } : prev,
          );
        }, 1200);

        const clearFlashTimer = setTimeout(
          () => setLeaderboardPlacementFlash(false),
          520,
        );

        previousPhaseRef.current = phase;

        return () => {
          clearTimeout(clearFocusTimer);
          clearTimeout(clearFlashTimer);
        };
      }
    }

    previousPhaseRef.current = phase;
  }, [phase, breakdownOrder, breakdownPIndex]);

  useEffect(() => {
    if (phase !== 'leaderboard' || currentlyRevealed.length === 0) return;

    const currentRanks = new Map(
      currentlyRevealed.map((entry, idx) => [entry.id, idx + 1]),
    );

    if (previousRanksRef.current.size === 0) {
      previousRanksRef.current = currentRanks;
      return;
    }

    const motionById = {};
    let hasDemotion = false;

    currentRanks.forEach((currentRank, entryId) => {
      if (!previousRanksRef.current.has(entryId)) return;

      const prevRank = previousRanksRef.current.get(entryId);
      if (prevRank === currentRank) return;

      const delta = currentRank - prevRank;
      motionById[entryId] = {
        direction: delta > 0 ? 'down' : 'up',
        distance: Math.abs(delta),
      };

      if (delta > 0) {
        hasDemotion = true;
      }
    });

    previousRanksRef.current = currentRanks;

    if (Object.keys(motionById).length === 0) return;

    setRankMotionById(motionById);
    setLeaderboardStagePunchSignal((prev) => prev + 1);
    const clearTimer = setTimeout(() => setRankMotionById({}), 1300);

    let shockTimer;
    if (hasDemotion) {
      setLeaderboardShockwave(true);
      shockTimer = setTimeout(() => setLeaderboardShockwave(false), 620);
    }

    return () => {
      clearTimeout(clearTimer);
      if (shockTimer) clearTimeout(shockTimer);
    };
  }, [currentlyRevealed, phase]);

  // When the final card (rank 1) is revealed, fire confetti
  useEffect(() => {
    if (allRevealed && total > 0) {
      playVictoryFanfare();
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(t);
    }
  }, [allRevealed, total]);

  // Firework on each judge reveal
  useEffect(() => {
    if (phase === 'breakdown' && breakdownJIndex > 0) {
      const duration = 1000;
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 20,
        spread: 360,
        ticks: 40,
        zIndex: 100,
      };

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 30 * (timeLeft / duration);
        confetti(
          Object.assign({}, defaults, {
            particleCount,
            origin: {
              x: Math.random() * 0.6 + 0.2,
              y: Math.random() * 0.4 + 0.1,
            },
            colors: [
              '#2dd4bf',
              '#f59e0b',
              '#a78bfa',
              '#f472b6',
              '#34d399',
              '#fbbf24',
            ],
          }),
        );
      }, 250);

      return () => clearInterval(interval);
    }
  }, [breakdownJIndex, phase]);

  // Auto mode ticker
  useEffect(() => {
    if (mode !== 'auto' || !started) return;

    let timer;

    if (phase === 'breakdown') {
      const currentParticipant = breakdownOrder[breakdownPIndex];
      const N = currentParticipant?.scores?.length || 0;

      if (breakdownJIndex <= N) {
        timer = setTimeout(() => {
          setBreakdownJIndex((j) => j + 1);
        }, autoSpeed);
      } else {
        // short wait before moving to leaderboard
        timer = setTimeout(() => {
          setPhase('leaderboard');
        }, autoSpeed * 1.5);
      }
    } else if (phase === 'leaderboard') {
      if (breakdownPIndex < breakdownOrder.length - 1) {
        timer = setTimeout(() => {
          setBreakdownPIndex((p) => p + 1);
          setBreakdownJIndex(0);
          setPhase('breakdown');
        }, autoSpeed * 2);
      }
    }

    return () => clearTimeout(timer);
  }, [
    mode,
    started,
    phase,
    breakdownPIndex,
    breakdownJIndex,
    autoSpeed,
    breakdownOrder,
  ]);

  function handleStart() {
    // Check if there are participants
    if (breakdownOrder.length === 0) {
      setPhase('leaderboard');
    } else {
      setPhase('breakdown');
      setBreakdownPIndex(0);
      setBreakdownJIndex(0);
    }
    setStarted(true);
    setShowConfetti(false);
    setRankMotionById({});
    setLeaderboardShockwave(false);
    setLeaderboardStagePunchSignal(0);
    setLeaderboardPlacementFlash(false);
    setPlacementFocus({ id: null, signal: 0 });
    previousRanksRef.current = new Map();
    previousPhaseRef.current = 'intro';
  }

  function handleNext() {
    if (phase === 'breakdown') {
      const currentParticipant = breakdownOrder[breakdownPIndex];
      const N = currentParticipant?.scores?.length || 0;
      if (breakdownJIndex <= N) {
        setBreakdownJIndex((j) => j + 1);
      } else {
        setPhase('leaderboard');
      }
    } else if (phase === 'leaderboard') {
      if (breakdownPIndex < breakdownOrder.length - 1) {
        setBreakdownPIndex((p) => p + 1);
        setBreakdownJIndex(0);
        setPhase('breakdown');
      }
    }
  }

  function handlePrev() {
    if (phase === 'breakdown') {
      if (breakdownJIndex > 0) {
        setBreakdownJIndex((j) => j - 1);
      } else if (breakdownPIndex > 0) {
        setBreakdownPIndex((p) => p - 1);
        setPhase('leaderboard');
      }
    } else if (phase === 'leaderboard') {
      setPhase('breakdown');
      const currentParticipant = breakdownOrder[breakdownPIndex];
      setBreakdownJIndex((currentParticipant?.scores?.length || 0) + 1);
    }
  }

  function handleSkipToLeaderboard() {
    setStarted(true);
    setShowConfetti(false);
    setRankMotionById({});
    setLeaderboardShockwave(false);
    setLeaderboardStagePunchSignal(0);
    setLeaderboardPlacementFlash(false);
    setPlacementFocus({ id: null, signal: 0 });
    previousRanksRef.current = new Map();
    previousPhaseRef.current = 'intro';
    if (breakdownOrder.length > 0) {
      setBreakdownPIndex(breakdownOrder.length - 1);
    }
    setPhase('leaderboard');
  }

  function handleReset() {
    setPhase('intro');
    setBreakdownPIndex(0);
    setBreakdownJIndex(0);
    setStarted(false);
    setShowConfetti(false);
    setRankMotionById({});
    setLeaderboardShockwave(false);
    setLeaderboardStagePunchSignal(0);
    setLeaderboardPlacementFlash(false);
    setPlacementFocus({ id: null, signal: 0 });
    previousRanksRef.current = new Map();
    previousPhaseRef.current = 'intro';
  }

  function handleModeToggle(newMode) {
    setMode(newMode);
    setPhase('intro');
    setBreakdownPIndex(0);
    setBreakdownJIndex(0);
    setStarted(false);
    setShowConfetti(false);
    setRankMotionById({});
    setLeaderboardShockwave(false);
    setLeaderboardStagePunchSignal(0);
    setLeaderboardPlacementFlash(false);
    setPlacementFocus({ id: null, signal: 0 });
    previousRanksRef.current = new Map();
    previousPhaseRef.current = 'intro';
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-700 border-t-emerald-400 animate-spin" />
          <p className="text-zinc-500 text-sm">{t('loadingResults')}</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <p className="text-red-400 text-sm bg-red-950/30 border border-red-800/50 rounded-xl px-5 py-3">
          {error}
        </p>
      </div>
    );
  }

  /* ── Not ready ── */
  if (!data?.allScored) {
    const totalParticipants = data?.ranked?.length ?? 0;
    const fullyScored =
      data?.ranked?.filter(
        (p) => p.judgesScored === data.assignedJudgesCount,
      ).length ?? 0;
    const progressPct = totalParticipants
      ? Math.round((fullyScored / totalParticipants) * 100)
      : 0;
    const liveRanked =
      data?.ranked?.slice().filter((p) => p.judgesScored > 0) ?? [];

    const currentParticipant = data?.ranked?.find(p => p.id === liveState?.current_participant_id);
    const liveScores = currentParticipant?.scores || [];
    const isTurnActive = liveState?.status === 'active';

    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-10 overflow-hidden relative">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="text-center w-full max-w-6xl relative z-10">
          {isTurnActive ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              {/* Live Status Badge */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('liveOnStage')}
              </div>

              {/* Participant Name */}
              <h2 className="text-7xl md:text-9xl font-black text-white tracking-tighter mb-4 drop-shadow-2xl">
                {currentParticipant?.name}
              </h2>
              
              <div className="h-1 w-24 bg-linear-to-r from-transparent via-emerald-500 to-transparent mb-12 opacity-50" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-4">
                {/* Countdown Card */}
                <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2 relative z-10">{t('remainingTime')}</span>
                  <div className="relative z-10">
                    <LiveCountdown expiresAt={liveState?.turn_expires_at_ms} serverNow={liveState?.server_now_ms} />
                  </div>
                </div>

                {/* Score Counter Card */}
                <div className="md:col-span-2 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-linear-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{t('judgeScores')}</span>
                    <div className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-mono">
                      {liveScores.length} / {data.assignedJudgesCount}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 relative z-10">
                    <AnimatePresence mode="popLayout">
                      {liveScores.map((s, i) => (
                        <motion.div
                          key={`score-${i}`}
                          initial={{ scale: 0, opacity: 0, y: 10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3 flex flex-col items-center min-w-[100px] shadow-lg shadow-emerald-900/10"
                        >
                          <span className="text-2xl font-black text-emerald-400 tabular-nums">{s.score}</span>
                          <span className="text-[9px] text-zinc-500 uppercase font-bold mt-1 truncate max-w-[80px]">{s.judgeName}</span>
                        </motion.div>
                      ))}
                      {Array.from({ length: Math.max(0, data.assignedJudgesCount - liveScores.length) }).map((_, i) => (
                        <div key={`waiting-${i}`} className="bg-zinc-800/20 border border-zinc-700/30 border-dashed rounded-2xl px-5 py-3 flex flex-col items-center min-w-[100px] opacity-40">
                          <span className="text-2xl font-black text-zinc-700">?</span>
                          <span className="text-[9px] text-zinc-600 uppercase font-bold mt-1">{t('waiting')}</span>
                        </div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Show mini leaderboard below */}
              {liveRanked.length > 0 && (
                <div className="mt-16 w-full max-w-4xl opacity-50 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-zinc-800" />
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">{t('currentStandings')}</span>
                    <div className="h-px flex-1 bg-zinc-800" />
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    {liveRanked.slice(0, 5).map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2 bg-zinc-900/30 px-3 py-1.5 rounded-full border border-zinc-800/50 text-xs">
                        <span className="text-zinc-600 font-mono">{i + 1}</span>
                        <span className="text-zinc-300 font-medium">{p.name}</span>
                        <span className="text-emerald-500 font-bold ml-1">{p.totalScore}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-900/30 border border-emerald-700/40 flex items-center justify-center mx-auto mb-5 relative">
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <svg
                  className="w-8 h-8 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6v6l4 2M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-zinc-100 mb-2">{t('scoringInProgress')}</h1>
              <p className="text-xs text-zinc-600 font-semibold uppercase tracking-widest mb-6">
                {data?.event?.name}
              </p>

              {totalParticipants > 0 && (
                <div className="mb-6 text-left max-w-sm mx-auto">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                    <span>{t('progress')}</span>
                    <span className="font-mono text-emerald-400">
                      {fullyScored}/{totalParticipants}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {liveRanked.length > 0 && (
                <div className="mb-6 text-left bg-zinc-900/60 border border-zinc-800 rounded-xl divide-y divide-zinc-800 overflow-hidden max-w-sm mx-auto">
                  {liveRanked.slice(0, 5).map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="text-zinc-300 truncate">
                        <span className="text-zinc-500 mr-2 font-mono">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {p.name}
                      </span>
                      <span className="font-mono tabular-nums text-emerald-300 shrink-0">
                        {p.totalScore}
                        <span className="text-zinc-600 text-xs ml-1.5">
                          ({p.judgesScored}/{data.assignedJudgesCount})
                        </span>
                      </span>
                    </div>
                  ))}
                  {liveRanked.length > 5 && (
                    <p className="text-xs text-zinc-600 text-center py-2">
                      {t('andOthers', { count: liveRanked.length - 5 })}
                    </p>
                  )}
                </div>
              )}

              <p className="text-[10px] text-zinc-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t('autoUpdating')}
              </p>
              <button
                onClick={fetchData}
                className="mt-3 text-xs text-emerald-500 hover:text-emerald-300 transition"
              >
                {t('refreshNow')}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── Presentation ── */
  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col">
      {showConfetti && <Confetti />}

      {/* Top bar */}
      <div className="shrink-0 border-b border-zinc-800/60 bg-zinc-900/80 backdrop-blur px-4 py-3 flex items-center justify-between gap-4">
        {/* Event name */}
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
            {t('results')}
          </p>
          <h1 className="text-sm font-bold text-zinc-100 truncate">
            {data.event.name}
          </h1>
        </div>

        {/* Mode switcher + speed */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mode toggle */}
          <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 gap-0.5">
            {['manual', 'auto'].map((m) => (
              <button
                key={m}
                onClick={() => handleModeToggle(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition ${
                  mode === m
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {m === 'manual' ? `⏸ ${t('manual')}` : `▶ ${t('auto')}`}
              </button>
            ))}
          </div>

          {/* Auto speed select */}
          {mode === 'auto' && (
            <select
              value={autoSpeed}
              onChange={(e) => {
                setAutoSpeed(Number(e.target.value));
                setStarted(false);
                setPhase('intro');
                setBreakdownPIndex(0);
                setBreakdownJIndex(0);
              }}
              className="bg-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1.5 border border-zinc-700 outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={1000}>{t('fast')} (1{t('seconds')})</option>
              <option value={2000}>{t('normal')} (2{t('seconds')})</option>
              <option value={3500}>{t('slow')} (3.5{t('seconds')})</option>
              <option value={5000}>{t('verySlow')} (5{t('seconds')})</option>
            </select>
          )}
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 pt-8 pb-12">
        {/* Pre-start screen */}
        {phase === 'intro' ? (
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-900/60">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-zinc-100 mb-2">
              {t('readyForReveal')}
            </h2>
            <p className="text-zinc-500 text-sm mb-8">
              {t('participantsCount', { count: total })} ·{' '}
              {mode === 'auto'
                ? t('autoRevealHelp', { speed: autoSpeed / 1000 })
                : t('manualRevealHelp')}
            </p>
            <div className="flex flex-col gap-3 items-center">
              <button
                onClick={handleStart}
                className="px-8 py-3 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 text-white font-bold text-lg hover:from-emerald-400 hover:to-emerald-600 transition shadow-xl shadow-emerald-900/40 active:scale-95 w-64"
              >
                {t('startReveal')}
              </button>
              <button
                onClick={handleSkipToLeaderboard}
                className="px-8 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm hover:bg-zinc-700 transition active:scale-95 w-64 border border-zinc-700"
              >
                {t('skipToLeaderboard')}
              </button>
            </div>
          </div>
        ) : phase === 'breakdown' ? (
          /* Breakdown View */
          <div className="w-full max-w-5xl flex flex-col items-center">
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold mb-8">
              {t('evaluatingParticipant', { current: breakdownPIndex + 1, total: breakdownOrder.length })}
            </p>

            <h2 className="text-4xl md:text-5xl font-black mb-8 md:mb-12 text-emerald-400 text-center drop-shadow-md">
              {breakdownOrder[breakdownPIndex]?.name}
            </h2>

            {/* Judges Grid */}
            <div
              className={`flex flex-wrap items-center justify-center w-full mb-8 md:mb-12 min-h-[80px] ${
                (breakdownOrder[breakdownPIndex]?.scores?.length || 0) > 6
                  ? 'gap-3 md:gap-4'
                  : 'gap-4 md:gap-6'
              }`}
            >
              <AnimatePresence>
                {breakdownOrder[breakdownPIndex]?.scores?.map(
                  (scoreObj, idx) => {
                    const isRevealed = idx < breakdownJIndex;
                    const numScores =
                      breakdownOrder[breakdownPIndex]?.scores?.length || 0;
                    const isMany = numScores > 6;

                    return (
                      <motion.div
                        key={`${breakdownPIndex}-${idx}`}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{
                          opacity: 1,
                          scale: isRevealed ? [1, 1.2, 1] : 1,
                          y: 0,
                        }}
                        transition={{
                          duration: 0.5,
                          delay: isRevealed ? 0 : idx * 0.05,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className={`${
                          isMany
                            ? 'w-[28%] sm:w-28 md:w-32 p-2'
                            : 'w-[45%] sm:w-48 md:w-56 p-4'
                        } relative shrink-0 flex flex-col items-center justify-center`}
                      >
                        <motion.div
                          animate={isRevealed ? { scale: [1, 1.05, 1] } : {}}
                          transition={
                            isRevealed ? { duration: 0.8, delay: 0.2 } : {}
                          }
                          className="relative"
                        >
                          {/* Boom ring effect */}
                          {isRevealed && (
                            <motion.div
                              className="absolute inset-0 rounded-full border-2 border-emerald-500 z-0"
                              initial={{ scale: 0.8, opacity: 1 }}
                              animate={{ scale: 2.2, opacity: 0 }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                            />
                          )}
                          <span
                            className={`${
                              isMany ? 'text-4xl md:text-5xl' : 'text-6xl'
                            } font-black ${
                              isRevealed ? 'text-emerald-400' : 'text-zinc-600'
                            } relative z-10 flex items-center justify-center tabular-nums drop-shadow-md`}
                          >
                            {isRevealed ? (
                              <CountUp end={scoreObj.score} duration={0.6} />
                            ) : (
                              '?'
                            )}
                          </span>
                        </motion.div>

                        <div
                          className={`text-sm sm:text-base uppercase tracking-widest font-semibold mt-3 ${
                            isRevealed ? 'text-zinc-300' : 'text-zinc-500'
                          } text-center truncate w-full`}
                        >
                          {scoreObj.judgeName}
                        </div>
                      </motion.div>
                    );
                  },
                )}
              </AnimatePresence>
            </div>

            {/* Running Total */}
            <div className="min-h-[140px] md:min-h-[160px]">
              <AnimatePresence>
                {breakdownJIndex >
                  (breakdownOrder[breakdownPIndex]?.scores?.length || 0) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.3, y: 30 }}
                    animate={{
                      opacity: 1,
                      scale: [0.3, 1.2, 1],
                      y: [30, -5, 0],
                    }}
                    transition={{
                      duration: 0.7,
                      ease: [0.16, 1, 0.3, 1],
                      scale: { times: [0, 0.6, 1] },
                    }}
                    className="flex flex-col items-center p-6 bg-zinc-900/60 rounded-3xl border border-zinc-800 shadow-xl min-w-[200px]"
                  >
                    <div className="text-zinc-500 text-sm uppercase tracking-widest font-bold mb-2">
                      {t('totalScore')}
                    </div>
                    <motion.div
                      className="text-7xl font-black text-amber-500 drop-shadow-md tabular-nums relative"
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        repeatDelay: 0.5,
                      }}
                    >
                      <div className="absolute inset-0 blur-xl bg-amber-500/10 rounded-full" />
                      <span className="relative z-10">
                        <CountUp
                          end={(breakdownOrder[breakdownPIndex]?.scores || [])
                            .slice(0, breakdownJIndex)
                            .reduce((sum, s) => sum + s.score, 0)}
                          duration={0.8}
                        />
                      </span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* Leaderboard View */
          <div className="w-full max-w-7xl h-full flex flex-col md:flex-row gap-8 lg:gap-12 pb-4 relative">
            <AnimatePresence>
              {leaderboardStagePunchSignal > 0 && (
                <motion.div
                  key={`leaderboard-stage-punch-${leaderboardStagePunchSignal}`}
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: [0, 0.34, 0], scale: [0.985, 1.02, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute inset-0 rounded-3xl border border-cyan-300/28 shadow-[0_0_45px_rgba(34,211,238,0.25)] z-20"
                />
              )}

              {placementFocus.id && (
                <motion.div
                  key={`placement-dimmer-${placementFocus.signal}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.34, 0.16] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-0 rounded-3xl bg-zinc-950/35 z-10"
                />
              )}

              {leaderboardPlacementFlash && (
                <motion.div
                  key="leaderboard-placement-flash"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.24, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.48, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-400/15 via-cyan-200/20 to-cyan-400/15 z-30"
                />
              )}

              {placementFocus.id && placementTargetRank && (
                <div
                  key={`placement-tracker-${placementFocus.signal}`}
                  className={`pointer-events-none absolute top-3 bottom-3 -translate-x-1/2 z-40 ${
                    placementTargetRank <= 3 ? 'left-[26%]' : 'left-[74%]'
                  }`}
                >
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0.8 }}
                    animate={{ opacity: [0, 0.9, 0.18], scaleY: [0.8, 1, 1] }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="h-full w-[2px] rounded-full bg-gradient-to-b from-cyan-200/0 via-cyan-200/85 to-cyan-200/0 shadow-[0_0_18px_rgba(34,211,238,0.7)]"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: '-8%' }}
                    animate={{ opacity: [0, 1, 0], y: ['-8%', '95%', '108%'] }}
                    transition={{
                      duration: 0.9,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.04,
                    }}
                    className="absolute -left-[7px] top-0 h-4 w-4 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.95)]"
                  />
                </div>
              )}

              {leaderboardShockwave && (
                <>
                  <motion.div
                    key="leaderboard-shockwave"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.35, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-rose-500/18 via-rose-400/5 to-rose-500/10 z-30"
                  />
                  <motion.div
                    key="leaderboard-shockwave-ring"
                    initial={{ opacity: 0.45, scale: 0.96 }}
                    animate={{ opacity: [0.45, 0], scale: [0.96, 1.05] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="pointer-events-none absolute inset-0 rounded-3xl border border-rose-400/40 z-30"
                  />
                </>
              )}
            </AnimatePresence>

            {/* Split Screen Leaderboard */}

            {/* Left Side: Top 3 */}
            <div className="flex-1 flex flex-col gap-4 relative">
              <div className="mb-2 shrink-0">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                  {t('currentTop3')}
                </h3>
              </div>

              <div className="flex flex-col w-full relative h-[450px]">
                <AnimatePresence mode="popLayout">
                  {currentlyRevealed.slice(0, 3).map((entry, idx) => (
                    <Top3Card
                      key={entry.id}
                      entry={entry}
                      rank={idx + 1}
                      movement={rankMotionById[entry.id]}
                      isPlacementFocus={placementFocus.id === entry.id}
                      isMuted={
                        Boolean(placementFocus.id) &&
                        placementFocus.id !== entry.id
                      }
                      placementSignal={placementFocus.signal}
                      isNew={
                        !allRevealed &&
                        entry.id === breakdownOrder[breakdownPIndex]?.id
                      }
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Side: Ranks 4+ */}
            {total > 3 && (
              <div className="flex-1 flex flex-col overflow-hidden max-h-full">
                {/* Right side header */}
                <div className="mb-4 mt-2 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                    {t('otherRanks')}
                  </h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold text-right">
                    {allRevealed
                      ? t('allResultsRevealed', { total })
                      : t('revealedProgress', { current: currentlyRevealed.length, total })}
                  </p>
                </div>

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto pr-2 flex flex-col relative w-full pt-1">
                  <AnimatePresence mode="popLayout">
                    {currentlyRevealed.slice(3).map((entry, idx) => (
                      <RestListCard
                        key={entry.id}
                        entry={entry}
                        rank={idx + 4}
                        movement={rankMotionById[entry.id]}
                        isPlacementFocus={placementFocus.id === entry.id}
                        isMuted={
                          Boolean(placementFocus.id) &&
                          placementFocus.id !== entry.id
                        }
                        placementSignal={placementFocus.signal}
                        isNew={
                          !allRevealed &&
                          entry.id === breakdownOrder[breakdownPIndex]?.id
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Fallback if total <= 3 */}
            {total <= 3 && (
              <div className="flex-1 flex flex-col justify-center items-center opacity-50">
                <p className="text-zinc-600 text-sm italic">
                  {t('noMoreRanks')}
                </p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mt-2">
                  {allRevealed
                    ? t('allResultsRevealed', { total })
                    : t('revealedProgress', { current: currentlyRevealed.length, total })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      {started && (
        <div className="shrink-0 border-t border-zinc-800/60 bg-zinc-900/80 backdrop-blur px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={handleReset}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition"
          >
            {t('restart')}
          </button>

          {mode === 'manual' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                 disabled={
                  (phase === 'leaderboard' &&
                    breakdownPIndex === 0 &&
                    breakdownOrder.length === 0) ||
                  (phase === 'breakdown' &&
                    breakdownJIndex === 0 &&
                    breakdownPIndex === 0)
                }
                className="px-4 py-2 rounded-lg border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t('prev')}
              </button>
              <button
                onClick={handleNext}
                disabled={phase === 'leaderboard' && allRevealed}
                className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/40"
              >
                {phase === 'leaderboard' && allRevealed
                  ? t('allCompleted')
                  : t('next')}
              </button>
            </div>
          )}

          {mode === 'auto' && (
            <div className="flex items-center gap-2">
              {!(phase === 'leaderboard' && allRevealed) ? (
                <span className="text-xs text-emerald-400 animate-pulse">
                  {t('autoDisplaying')}
                </span>
              ) : (
                <span className="text-xs text-amber-400">{t('allResultsRevealed', { total })} 🎉</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
