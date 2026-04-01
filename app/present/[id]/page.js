'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

import { playDrumroll, playVictoryFanfare } from '@/lib/sounds';

/* ── Animated counter (Animation removed, kept for sound trigger) ── */
function CountUp({ end, duration = 1.2 }) {
  useEffect(() => {
    playDrumroll();
  }, []);
  return (
    <span className="tabular-nums">{end.toFixed(end % 1 === 0 ? 0 : 1)}</span>
  );
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
function Top3Card({ entry, rank }) {
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

  return (
    <motion.div
      layoutId={`card-${entry.id}`}
      initial={{ opacity: 0, x: -30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}
      className="flex w-full mb-3"
    >
      <div
        className={`relative overflow-hidden w-full rounded-2xl border ${borderColor} bg-gradient-to-r ${bgGradient} shadow-xl ${shadowColor} flex items-center px-6 py-5`}
      >
        {/* Accent bar at left */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accentGradient}`}
        />

        {/* Medal */}
        <div className="text-5xl mr-6 drop-shadow-md">{medal}</div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80 transition-colors"
            style={{
              color:
                rank === 1 ? '#fbbf24' : rank === 2 ? '#a1a1aa' : '#b45309',
            }}
          >
            {rank === 1 ? '1st Place' : rank === 2 ? '2nd Place' : '3rd Place'}
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
        <div className="text-right shrink-0 ml-4 flex flex-col items-end">
          <p
            className={`font-black tabular-nums transition-all duration-500 ${
              rank === 1 ? 'text-5xl' : 'text-4xl'
            } ${scoreText} drop-shadow-sm`}
          >
            <CountUp end={entry.totalScore} duration={0.8} />
          </p>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mt-1">
            pts
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Rest list card ────────────────────────────────────────────────────────── */
function RestListCard({ entry, rank }) {
  return (
    <motion.div
      layoutId={`card-${entry.id}`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}
      className="flex flex-col justify-center mb-2 shrink-0"
    >
      <div className="relative overflow-hidden rounded-xl border border-zinc-700/40 bg-zinc-900/50 hover:bg-zinc-900/70 px-4 py-3 flex items-center gap-4 transition">
        {/* Rank number */}
        <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-zinc-800 text-zinc-400 font-bold text-sm">
          {rank}
        </div>

        {/* Name + score */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-200 text-sm">{entry.name}</p>
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <p className="font-bold text-zinc-300 text-lg tabular-nums">
            <CountUp end={entry.totalScore} duration={0.8} />
          </p>
          <p className="text-xs text-zinc-600">pts</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main presentation page ───────────────────────────────────────────────── */
export default function PresentationPage() {
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

  // Phase: 'intro' | 'breakdown' | 'leaderboard'
  const [phase, setPhase] = useState('intro');
  const [breakdownPIndex, setBreakdownPIndex] = useState(0);
  const [breakdownJIndex, setBreakdownJIndex] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/events/${id}/results`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load results.');
        return;
      }
      setData(json);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
  }

  function handleModeToggle(newMode) {
    setMode(newMode);
    setPhase('intro');
    setBreakdownPIndex(0);
    setBreakdownJIndex(0);
    setStarted(false);
    setShowConfetti(false);
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-700 border-t-emerald-400 animate-spin" />
          <p className="text-zinc-500 text-sm">Loading results…</p>
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
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-900/30 border border-emerald-700/40 flex items-center justify-center mx-auto mb-5">
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
          <h1 className="text-xl font-bold text-zinc-100 mb-2">
            Scoring in progress
          </h1>
          <p className="text-sm text-zinc-500 mb-6">
            Not all judges have submitted their scores yet. Come back when
            scoring is complete.
          </p>
          <p className="text-xs text-zinc-600 font-semibold uppercase tracking-widest">
            {data?.event?.name}
          </p>
          <button
            onClick={fetchData}
            className="mt-4 text-xs text-emerald-500 hover:text-emerald-300 transition"
          >
            ↻ Refresh
          </button>
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
            Results
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
                {m === 'manual' ? '⏸ Manual' : '▶ Auto'}
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
              <option value={1000}>Fast (1s)</option>
              <option value={2000}>Normal (2s)</option>
              <option value={3500}>Slow (3.5s)</option>
              <option value={5000}>Very slow (5s)</option>
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
              Ready to reveal
            </h2>
            <p className="text-zinc-500 text-sm mb-8">
              {total} participant{total !== 1 ? 's' : ''} ·{' '}
              {mode === 'auto'
                ? `Auto reveal every ${autoSpeed / 1000}s`
                : 'You control each reveal'}
            </p>
            <div className="flex flex-col gap-3 items-center">
              <button
                onClick={handleStart}
                className="px-8 py-3 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 text-white font-bold text-lg hover:from-emerald-400 hover:to-emerald-600 transition shadow-xl shadow-emerald-900/40 active:scale-95 w-64"
              >
                Start Breakdown
              </button>
              <button
                onClick={handleSkipToLeaderboard}
                className="px-8 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm hover:bg-zinc-700 transition active:scale-95 w-64 border border-zinc-700"
              >
                Skip to Leaderboard
              </button>
            </div>
          </div>
        ) : phase === 'breakdown' ? (
          /* Breakdown View */
          <div className="w-full max-w-5xl flex flex-col items-center">
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold mb-8">
              Evaluating Participant {breakdownPIndex + 1} of{' '}
              {breakdownOrder.length}
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
                      Total Score
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
          <div className="w-full max-w-7xl h-full flex flex-col md:flex-row gap-8 lg:gap-12 pb-4">
            {/* Split Screen Leaderboard */}

            {/* Left Side: Top 3 */}
            <div className="flex-1 flex flex-col gap-4 relative">
              <div className="mb-2 shrink-0">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                  Live Top 3
                </h3>
              </div>

              <div className="flex flex-col w-full relative h-[450px]">
                <AnimatePresence mode="popLayout">
                  {currentlyRevealed.slice(0, 3).map((entry, idx) => (
                    <Top3Card key={entry.id} entry={entry} rank={idx + 1} />
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
                    Other Rankings
                  </h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold text-right">
                    {allRevealed
                      ? `All ${total} revealed`
                      : `Revealed ${currentlyRevealed.length} of ${total}`}
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
                  No further rankings
                </p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mt-2">
                  {allRevealed
                    ? `All ${total} results revealed`
                    : `Revealed ${currentlyRevealed.length} of ${total}`}
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
            ↺ Restart
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
                ← Prev
              </button>
              <button
                onClick={handleNext}
                disabled={phase === 'leaderboard' && allRevealed}
                className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/40"
              >
                {phase === 'leaderboard' && allRevealed
                  ? 'All done 🎉'
                  : 'Next →'}
              </button>
            </div>
          )}

          {mode === 'auto' && (
            <div className="flex items-center gap-2">
              {!(phase === 'leaderboard' && allRevealed) ? (
                <span className="text-xs text-emerald-400 animate-pulse">
                  Auto-revealing…
                </span>
              ) : (
                <span className="text-xs text-amber-400">
                  Presentation complete 🎉
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
