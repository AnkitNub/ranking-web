'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { playDrumroll, playVictoryFanfare } from '@/lib/sounds';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/authFetch';

/* ─── Animated counter with roll-up + sound trigger ───────────────────────── */
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
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (endValue - startValue) * eased;
      setDisplayValue(nextValue);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
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

        <div
          className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accentGradient}`}
        />

        <div className="text-5xl mr-6 drop-shadow-md z-10">{medal}</div>

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

/* ─── Rest list card ────────────────────────────────────────────────────── */
function RestListCard({
  entry,
  rank,
  isNew,
  movement,
  isPlacementFocus,
  isMuted,
  placementSignal,
}) {
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

        {isNew && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
          />
        )}

        <div
          className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center z-10 ${
            isNew
              ? 'bg-emerald-900/60 text-emerald-400'
              : 'bg-zinc-800 text-zinc-400'
          } font-bold text-sm`}
        >
          {rank}
        </div>

        <div className="flex-1 min-w-0 z-10">
          <p
            className={`font-semibold ${
              isNew ? 'text-emerald-100' : 'text-zinc-200'
            } text-sm`}
          >
            {entry.name}
          </p>
        </div>

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

/* ─── Animated leaderboard split (Top3 + Rest) ─────────────────────────── */
function LeaderboardSplit({
  ranked,
  highlightId,
  movementById,
  placementFocus,
}) {
  const { t } = useTranslation('common');
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  return (
    <div className="w-full max-w-7xl flex flex-col md:flex-row gap-8 lg:gap-12">
      <div className="flex-1 flex flex-col gap-4 relative">
        <div className="mb-2 shrink-0">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
            {t('currentTop3')}
          </h3>
        </div>
        <div className="flex flex-col w-full relative h-[450px]">
          <AnimatePresence mode="popLayout">
            {top3.map((entry, idx) => (
              <Top3Card
                key={entry.id}
                entry={entry}
                rank={idx + 1}
                movement={movementById[entry.id]}
                isPlacementFocus={placementFocus?.id === entry.id}
                isMuted={
                  Boolean(placementFocus?.id) &&
                  placementFocus.id !== entry.id
                }
                placementSignal={placementFocus?.signal ?? 0}
                isNew={highlightId === entry.id}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {rest.length > 0 ? (
        <div className="flex-1 flex flex-col overflow-hidden max-h-full">
          <div className="mb-4 mt-2 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
              {t('otherRanks')}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col relative w-full pt-1">
            <AnimatePresence mode="popLayout">
              {rest.map((entry, idx) => (
                <RestListCard
                  key={entry.id}
                  entry={entry}
                  rank={idx + 4}
                  movement={movementById[entry.id]}
                  isPlacementFocus={placementFocus?.id === entry.id}
                  isMuted={
                    Boolean(placementFocus?.id) &&
                    placementFocus.id !== entry.id
                  }
                  placementSignal={placementFocus?.signal ?? 0}
                  isNew={highlightId === entry.id}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center opacity-50">
          <p className="text-zinc-600 text-sm italic">{t('noMoreRanks')}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Hook: detect rank changes for leaderboard movement animation ──────── */
function useRankMovement(ranked) {
  const [movementById, setMovementById] = useState({});
  const previousRanksRef = useRef(new Map());

  useEffect(() => {
    if (ranked.length === 0) return;

    const currentRanks = new Map(ranked.map((p, idx) => [p.id, idx + 1]));

    if (previousRanksRef.current.size === 0) {
      previousRanksRef.current = currentRanks;
      return;
    }

    const movements = {};
    currentRanks.forEach((rank, id) => {
      const prev = previousRanksRef.current.get(id);
      if (prev != null && prev !== rank) {
        const delta = rank - prev;
        movements[id] = {
          direction: delta > 0 ? 'down' : 'up',
          distance: Math.abs(delta),
        };
      }
    });

    previousRanksRef.current = currentRanks;

    if (Object.keys(movements).length === 0) return;

    setMovementById(movements);
    const t = setTimeout(() => setMovementById({}), 1300);
    return () => clearTimeout(t);
  }, [ranked]);

  return movementById;
}

/* ─── Interlude breakdown (per-participant reveal) ──────────────────────── */
//
// Phases:
//   0..N-1 : reveal judge `phase` one at a time
//   N      : show running total
//   N+1+   : show animated leaderboard re-sort with the new participant placed
//
function InterludeReveal({ participant, ranked, onLeaderboardShown }) {
  const { t } = useTranslation('common');
  const scores = participant?.scores ?? [];
  const N = scores.length;
  const [phase, setPhase] = useState(0);
  const [stage, setStage] = useState('breakdown'); // 'breakdown' | 'leaderboard'

  // Auto-advance phases until we hit the leaderboard.
  useEffect(() => {
    if (stage === 'leaderboard') return;
    if (phase < N) {
      const t = setTimeout(() => setPhase((p) => p + 1), 1100);
      return () => clearTimeout(t);
    }
    if (phase === N) {
      const t = setTimeout(() => setPhase((p) => p + 1), 1500);
      return () => clearTimeout(t);
    }
    // phase > N: switch to leaderboard
    const t = setTimeout(() => {
      setStage('leaderboard');
      onLeaderboardShown?.();
    }, 600);
    return () => clearTimeout(t);
  }, [phase, N, stage, onLeaderboardShown]);

  const movementById = useRankMovement(stage === 'leaderboard' ? ranked : []);
  const participantId = participant?.id;
  const placementFocus = useMemo(
    () =>
      stage === 'leaderboard' && participantId != null
        ? { id: participantId, signal: 1 }
        : { id: null, signal: 0 },
    [stage, participantId],
  );

  // Firework on each judge reveal.
  useEffect(() => {
    if (stage !== 'breakdown' || phase === 0 || phase > N) return;
    const duration = 800;
    const animationEnd = Date.now() + duration;
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 24 * (timeLeft / duration);
      confetti({
        startVelocity: 20,
        spread: 360,
        ticks: 40,
        zIndex: 100,
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
      });
    }, 250);
    return () => clearInterval(interval);
  }, [phase, stage, N]);

  if (!participant) return null;

  if (stage === 'breakdown') {
    const total = scores
      .slice(0, Math.min(phase, N))
      .reduce((sum, s) => sum + s.score, 0);

    return (
      <div className="w-full max-w-5xl flex flex-col items-center">
        <p className="text-xs text-cyan-400 uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          {t('interlude')}
        </p>
        <h2 className="text-4xl md:text-5xl font-black mb-8 md:mb-12 text-emerald-400 text-center drop-shadow-md">
          {participant.name}
        </h2>

        <div
          className={`flex flex-wrap items-center justify-center w-full mb-8 md:mb-12 min-h-[80px] ${
            N > 6 ? 'gap-3 md:gap-4' : 'gap-4 md:gap-6'
          }`}
        >
          <AnimatePresence>
            {scores.map((scoreObj, idx) => {
              const isRevealed = idx < phase;
              const isMany = N > 6;
              return (
                <motion.div
                  key={`${participant.id}-${idx}`}
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
                    transition={isRevealed ? { duration: 0.8, delay: 0.2 } : {}}
                    className="relative"
                  >
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
            })}
          </AnimatePresence>
        </div>

        <div className="min-h-[140px] md:min-h-[160px]">
          <AnimatePresence>
            {phase >= N && (
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
                  {t('newTotal')}
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
                    <CountUp end={total} duration={0.8} />
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Leaderboard with the new participant placed.
  return (
    <LeaderboardSplit
      ranked={ranked}
      highlightId={participant.id}
      movementById={movementById}
      placementFocus={placementFocus}
    />
  );
}

/* ─── Live scoring view (active turn) ───────────────────────────────────── */
function LiveScoringView({ data }) {
  const { t } = useTranslation('common');
  const currentParticipant = data?.ranked?.find(
    (p) => p.id === data?.event?.current_participant_id,
  );
  const liveScores = currentParticipant?.scores ?? [];
  const totalScore = liveScores.reduce((sum, s) => sum + s.score, 0);
  const assignedJudgesCount = data?.assignedJudgesCount ?? 0;
  const votedCount = liveScores.length;
  const waitingCount = Math.max(0, assignedJudgesCount - votedCount);

  // Participant progress (e.g. "2 of 5")
  const participantsOrder = data?.event?.participants_order ?? [];
  const currentIndex =
    participantsOrder.indexOf(data?.event?.current_participant_id) + 1;
  const totalParticipants = participantsOrder.length;

  // Only show leaderboard for already-scored participants
  const ranked = (data?.ranked ?? []).filter(
    (p) => p.judgesScored > 0 && p.id !== data?.event?.current_participant_id,
  );
  const movementById = useRankMovement(ranked);

  const hasLeaderboard = ranked.length > 0;

  /* ── Participant info panel (reused in both layouts) ── */
  const participantPanel = (compact = false) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex flex-col ${compact ? 'items-start' : 'items-center'}`}
    >
      {/* Progress label */}
      {totalParticipants > 0 && (
        <p className={`text-zinc-600 text-[10px] font-black uppercase tracking-[0.28em] ${compact ? 'mb-3' : 'mb-5'}`}>
          {t('evaluatingParticipant', { current: currentIndex, total: totalParticipants })}
        </p>
      )}

      {/* Live badge */}
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] ${compact ? 'mb-4' : 'mb-6'}`}>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        {t('liveOnStage')}
      </div>

      {/* Participant name */}
      <h2
        className={`font-black tracking-tighter ${compact ? 'text-4xl sm:text-5xl mb-2 text-left' : 'text-5xl sm:text-7xl md:text-8xl mb-3 text-center'} drop-shadow-2xl`}
        style={{ color: '#00e676' }}
      >
        {currentParticipant?.name ?? '—'}
      </h2>
      <div className={`h-0.5 rounded-full bg-emerald-500/30 ${compact ? 'w-20 mb-6 self-start' : 'w-28 mb-10'}`} />

      {/* Vote counter */}
      <div className={`flex flex-col ${compact ? 'items-start' : 'items-center'} gap-3`}>
        <div className="flex items-baseline gap-2">
          <span className={`font-black tabular-nums text-white leading-none ${compact ? 'text-5xl' : 'text-6xl sm:text-7xl'}`}>
            {votedCount}
          </span>
          <span className="text-2xl font-black text-zinc-600 leading-none">/</span>
          <span className={`font-black text-zinc-500 tabular-nums leading-none ${compact ? 'text-2xl' : 'text-3xl'}`}>
            {assignedJudgesCount}
          </span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
          {t('judgesVoted')}
        </p>
        {assignedJudgesCount > 0 && (
          <div className="flex gap-3 mt-1">
            {Array.from({ length: assignedJudgesCount }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-500 ${compact ? 'w-3 h-3' : 'w-4 h-4'} ${
                  i < votedCount
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-500/50 scale-110'
                    : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="w-full max-w-6xl">
      {hasLeaderboard ? (
        /* ── Two-column layout when leaderboard is present ── */
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-center w-full">
          {/* Left: participant info */}
          <div className="lg:flex-1 lg:sticky lg:top-8">
            {participantPanel(true)}
          </div>
          {/* Right: leaderboard */}
          <div className="lg:flex-1 w-full">
            <LeaderboardSplit
              ranked={ranked}
              highlightId={null}
              movementById={movementById}
              placementFocus={null}
            />
          </div>
        </div>
      ) : (
        /* ── Full centered layout when no leaderboard yet ── */
        <div className="flex flex-col items-center">
          {participantPanel(false)}
        </div>
      )}
    </div>
  );
}

/* ─── Final leaderboard view ────────────────────────────────────────────── */
function FinalLeaderboardView({ data }) {
  const { t } = useTranslation('common');
  const [showConfetti, setShowConfetti] = useState(true);
  const ranked = data?.ranked ?? [];
  const movementById = useRankMovement(ranked);

  useEffect(() => {
    playVictoryFanfare();
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showConfetti && <Confetti />}
      <div className="w-full max-w-7xl flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-[0.2em]">
          🏆 {t('allCompleted')}
        </div>
        <LeaderboardSplit
          ranked={ranked}
          highlightId={null}
          movementById={movementById}
          placementFocus={null}
        />
      </div>
    </>
  );
}

/* ─── Host Controller Overlay ────────────────────────────────────────────── */
function HostController({ eventId, status, onRefresh }) {
  const { t } = useTranslation('common');
  const [busy, setBusy] = useState(false);

  async function handleNext() {
    setBusy(true);
    try {
      const res = await authFetch(`/api/events/${eventId}/next-participant`, {
        method: 'POST',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.message || d.error || 'Error');
      } else {
        onRefresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700 shadow-2xl rounded-2xl p-4 flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">
            {t('hostControls')}
          </span>
          <span className="text-xs font-bold text-zinc-300">
            {status === 'active' ? t('votingInProgress') : t('resultsReveal')}
          </span>
        </div>
        <button
          onClick={handleNext}
          disabled={busy}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2"
        >
          {busy ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
          {t('nextStep')}
        </button>
      </div>
    </div>
  );
}

/* ─── Main presentation page ───────────────────────────────────────────── */
export default function PresentationPage() {
  const { t } = useTranslation('common');
  const { id } = useParams();
  const { supabaseUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isHost = supabaseUser?.id === data?.event?.admin_id;

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
  }, [id, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll the public results endpoint. Faster cadence during active scoring so
  // judge submissions show up promptly; slower at idle.
  useEffect(() => {
    const status = data?.event?.status;
    if (status === 'ended') return undefined;
    if (typeof document !== 'undefined' && document.hidden) return undefined;
    const intervalMs = status === 'active' ? 1500 : 2500;
    const id = setInterval(fetchData, intervalMs);
    return () => clearInterval(id);
  }, [data?.event?.status, fetchData]);

  const status = data?.event?.status ?? 'not_started';

  // Identify the just-scored participant during interlude.
  const interludeParticipant = useMemo(() => {
    if (status !== 'interlude') return null;
    const id = data?.event?.current_participant_id;
    return data?.ranked?.find((p) => p.id === id) ?? null;
  }, [status, data]);

  // For interlude leaderboard, show all participants who have at least one score.
  const interludeRanked = useMemo(() => {
    return (data?.ranked ?? []).filter((p) => p.judgesScored > 0);
  }, [data]);

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

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <p className="text-red-400 text-sm bg-red-950/30 border border-red-800/50 rounded-xl px-5 py-3">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top bar */}
      <div className="shrink-0 border-b border-zinc-800/60 bg-zinc-900/80 backdrop-blur px-4 py-3 flex items-center justify-between gap-4 z-10">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
            {t('results')}
          </p>
          <h1 className="text-sm font-bold text-zinc-100 truncate">
            {data?.event?.name}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${
              status === 'active'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : status === 'interlude'
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
                  : status === 'ended'
                    ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                    : 'border-zinc-600/40 bg-zinc-700/10 text-zinc-400'
            }`}
          >
            {status === 'active'
              ? t('liveOnStage')
              : status === 'interlude'
                ? t('interlude')
                : status === 'ended'
                  ? t('allCompleted')
                  : t('eventNotStarted')}
          </span>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-6 relative z-0">
        <AnimatePresence mode="wait">
          {status === 'not_started' && (
            <motion.div
              key="not_started"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
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
              <h1 className="text-xl font-bold text-zinc-100 mb-1">
                {t('eventNotStarted')}
              </h1>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mt-3 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t('autoUpdating')}
              </p>
            </motion.div>
          )}

          {status === 'active' && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex justify-center"
            >
              <LiveScoringView data={data} />
            </motion.div>
          )}

          {status === 'interlude' && interludeParticipant && (
            <motion.div
              key={`interlude-${interludeParticipant.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex justify-center"
            >
              <InterludeReveal
                participant={interludeParticipant}
                ranked={interludeRanked}
              />
            </motion.div>
          )}

          {status === 'ended' && (
            <motion.div
              key="ended"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex justify-center"
            >
              <FinalLeaderboardView data={data} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isHost && (status === 'active' || status === 'interlude') && (
        <HostController
          key="host-controller"
          eventId={id}
          status={status}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
