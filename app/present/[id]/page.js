'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

import { playDrumroll, playVictoryFanfare } from '@/lib/sounds';

/* ── Animated counter ── */
function CountUp({ end, duration = 1.2 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    playDrumroll();
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setVal(end);
        clearInterval(timer);
      } else {
        setVal(Math.round(start * 10) / 10);
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [end, duration]);
  return (
    <span className="tabular-nums">{val.toFixed(val % 1 === 0 ? 0 : 1)}</span>
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

/* ─── Podium card for top 3 ───────────────────────────────────────────────── */
function PodiumCard({ entry, rank, visible }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
  const heightClass = rank === 1 ? 'h-56' : rank === 2 ? 'h-48' : 'h-44';
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
  const badgeBg =
    rank === 1
      ? 'bg-amber-400/20'
      : rank === 2
        ? 'bg-zinc-400/10'
        : 'bg-amber-700/20';
  const badgeText =
    rank === 1
      ? 'text-amber-300'
      : rank === 2
        ? 'text-zinc-300'
        : 'text-amber-500';
  const badgeRing =
    rank === 1
      ? 'ring-amber-400/40'
      : rank === 2
        ? 'ring-zinc-400/30'
        : 'ring-amber-700/40';
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
    <div
      className={`transition-all duration-700 ease-out ${
        visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-12 scale-90 pointer-events-none'
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-t-3xl border-t border-l border-r ${borderColor} bg-gradient-to-b ${bgGradient} shadow-2xl ${shadowColor} ${heightClass} flex flex-col items-center justify-end px-4 py-4`}
      >
        {/* Accent bar at top */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentGradient} rounded-t-3xl`}
        />

        {/* Medal + Score */}
        <div className="flex flex-col items-center gap-2 mb-3">
          <div className={`text-4xl font-black`}>{medal}</div>
          <p className={`font-black tabular-nums text-4xl ${scoreText}`}>
            {visible ? <CountUp end={entry.totalScore} duration={0.8} /> : 0}
          </p>
          <p className="text-xs text-zinc-500 font-semibold leading-none">
            pts
          </p>
        </div>

        {/* Name */}
        <p className={`font-bold text-center truncate max-w-full ${nameText}`}>
          {rank === 1 ? (
            <span className="text-xl">{entry.name}</span>
          ) : (
            <span className="text-base">{entry.name}</span>
          )}
        </p>

        {/* Rank label */}
        {rank === 1 && (
          <p className="text-xs text-amber-400/80 font-semibold uppercase tracking-widest mt-2">
            1st Place
          </p>
        )}
        {rank === 2 && (
          <p className="text-xs text-zinc-400/80 font-semibold uppercase tracking-widest mt-1">
            2nd Place
          </p>
        )}
        {rank === 3 && (
          <p className="text-xs text-amber-600/80 font-semibold uppercase tracking-widest mt-1">
            3rd Place
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Rest list card ────────────────────────────────────────────────────────── */
function RestListCard({ entry, rank, visible }) {
  return (
    <div
      className={`transition-all duration-500 ease-out overflow-hidden flex flex-col justify-center ${
        visible
          ? 'max-h-[100px] opacity-100 translate-y-0 mb-2'
          : 'max-h-0 opacity-0 -translate-y-4 mb-0 pointer-events-none'
      }`}
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
            {visible ? <CountUp end={entry.totalScore} duration={0.8} /> : 0}
          </p>
          <p className="text-xs text-zinc-600">pts</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main presentation page ───────────────────────────────────────────────── */
export default function PresentationPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reveal state: how many cards are currently visible (counted from last rank)
  const [revealed, setRevealed] = useState(0);
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

  // ranked from last → first for reveal order
  const revealOrder = useMemo(
    () => (data?.ranked ? [...data.ranked].reverse() : []),
    [data],
  );
  const breakdownOrder = useMemo(
    () =>
      data?.ranked
        ? [...data.ranked].sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [data],
  );

  const total = revealOrder.length;
  const allRevealed = revealed >= total;

  // When the final card (rank 1) is revealed, fire confetti
  useEffect(() => {
    if (phase === 'leaderboard' && allRevealed && total > 0) {
      playVictoryFanfare();
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(t);
    }
  }, [allRevealed, total, phase]);

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

      if (breakdownJIndex < N) {
        timer = setTimeout(() => {
          setBreakdownJIndex((j) => j + 1);
        }, autoSpeed);
      } else {
        // short wait before moving to next participant (1.25x the speed)
        timer = setTimeout(() => {
          if (breakdownPIndex < breakdownOrder.length - 1) {
            setBreakdownPIndex((p) => p + 1);
            setBreakdownJIndex(0);
          } else {
            setPhase('leaderboard');
          }
        }, autoSpeed * 1.5);
      }
    } else if (phase === 'leaderboard') {
      if (!allRevealed) {
        timer = setTimeout(() => {
          setRevealed((r) => {
            if (r >= total) return r;
            return r + 1;
          });
        }, autoSpeed);
      }
    }

    return () => clearTimeout(timer);
  }, [
    mode,
    started,
    phase,
    breakdownPIndex,
    breakdownJIndex,
    allRevealed,
    revealed,
    autoSpeed,
    total,
    breakdownOrder,
  ]);

  function handleStart() {
    // Check if there are participants
    if (breakdownOrder.length === 0) {
      setPhase('leaderboard');
      setRevealed(mode === 'manual' ? 1 : 0);
    } else {
      setPhase('breakdown');
      setBreakdownPIndex(0);
      setBreakdownJIndex(0);
      setRevealed(0);
    }
    setStarted(true);
    setShowConfetti(false);
  }

  function handleNext() {
    if (phase === 'breakdown') {
      const currentParticipant = breakdownOrder[breakdownPIndex];
      const N = currentParticipant?.scores?.length || 0;
      if (breakdownJIndex < N) {
        setBreakdownJIndex((j) => j + 1);
      } else {
        if (breakdownPIndex < breakdownOrder.length - 1) {
          setBreakdownPIndex((p) => p + 1);
          setBreakdownJIndex(0);
        } else {
          setPhase('leaderboard');
          setRevealed(1);
        }
      }
    } else if (phase === 'leaderboard') {
      if (revealed < total) setRevealed((r) => r + 1);
    }
  }

  function handlePrev() {
    if (phase === 'breakdown') {
      if (breakdownJIndex > 0) {
        setBreakdownJIndex((j) => j - 1);
      } else if (breakdownPIndex > 0) {
        setBreakdownPIndex((p) => p - 1);
        const prevParticipant = breakdownOrder[breakdownPIndex - 1];
        setBreakdownJIndex(prevParticipant?.scores?.length || 0);
      }
    } else if (phase === 'leaderboard') {
      if (revealed > 1) {
        setRevealed((r) => r - 1);
      } else {
        // Go back to breakdown
        if (breakdownOrder.length > 0) {
          setPhase('breakdown');
          setBreakdownPIndex(breakdownOrder.length - 1);
          const lastParticipant = breakdownOrder[breakdownOrder.length - 1];
          setBreakdownJIndex(lastParticipant?.scores?.length || 0);
          setRevealed(0);
        }
      }
    }
  }

  function handleSkipToLeaderboard() {
    setStarted(true);
    setShowConfetti(false);
    setPhase('leaderboard');
    setRevealed(mode === 'manual' ? 1 : 0);
  }

  function handleReset() {
    setPhase('intro');
    setBreakdownPIndex(0);
    setBreakdownJIndex(0);
    setRevealed(0);
    setStarted(false);
    setShowConfetti(false);
  }

  function handleModeToggle(newMode) {
    setMode(newMode);
    setPhase('intro');
    setBreakdownPIndex(0);
    setBreakdownJIndex(0);
    setRevealed(0);
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
                setRevealed(0);
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
          <div className="w-full max-w-4xl flex flex-col items-center">
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold mb-8">
              Evaluating Participant {breakdownPIndex + 1} of{' '}
              {breakdownOrder.length}
            </p>

            <h2 className="text-5xl font-black mb-12 text-emerald-400 text-center drop-shadow-md">
              {breakdownOrder[breakdownPIndex]?.name}
            </h2>

            {/* Judges Grid */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 w-full mb-12 min-h-[80px]">
              <AnimatePresence>
                {breakdownOrder[breakdownPIndex]?.scores
                  ?.slice(0, breakdownJIndex)
                  .map((scoreObj, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0, rotate: -15 }}
                      animate={{
                        opacity: 1,
                        scale: [0, 1.4, 1],
                        rotate: [-15, 5, 0],
                      }}
                      transition={{
                        duration: 0.6,
                        ease: [0.16, 1, 0.3, 1],
                        scale: { times: [0, 0.5, 1] },
                        rotate: { times: [0, 0.5, 1] },
                      }}
                      className="w-[45%] sm:w-48 md:w-56 relative p-4 shrink-0 flex flex-col items-center justify-center"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="relative"
                      >
                        {/* Boom ring effect */}
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-emerald-500 z-0"
                          initial={{ scale: 0.8, opacity: 1 }}
                          animate={{ scale: 2.5, opacity: 0 }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                        <span className="text-6xl font-black text-emerald-400 relative z-10 flex items-center justify-center tabular-nums drop-shadow-md">
                          <CountUp end={scoreObj.score} duration={0.6} />
                        </span>
                      </motion.div>

                      <div className="text-xs uppercase tracking-widest font-semibold mt-4 text-zinc-400 text-center truncate w-full">
                        {scoreObj.judgeName}
                      </div>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>

            {/* Running Total */}
            <div className="min-h-[160px]">
              <AnimatePresence>
                {breakdownJIndex > 0 && (
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
          <>
            {/* Reveal counter */}
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold mb-8">
              {allRevealed
                ? `All ${total} results revealed`
                : `Revealing rank ${total - revealed + 1} of ${total}`}
            </p>

            {/* Podium section */}
            {total > 0 && (
              <div
                className={`w-full max-w-5xl transition-all duration-1000 ease-out flex justify-center ${
                  revealed >= total - 2
                    ? 'mb-6 max-h-[500px] opacity-100'
                    : 'mb-0 max-h-0 opacity-0 pointer-events-none'
                }`}
              >
                {/* Podium display - shows top 3 in podium formation */}
                <div className="grid grid-cols-3 gap-6 items-end w-full">
                  {/* 2nd Place - Left */}
                  {total >= 2 && (
                    <div className="flex justify-center">
                      <div className="w-full max-w-md">
                        <PodiumCard
                          entry={revealOrder[total - 2]}
                          rank={2}
                          visible={revealed >= total - 1}
                        />
                      </div>
                    </div>
                  )}

                  {/* 1st Place - Center - Elevated */}
                  {total >= 1 && (
                    <div className="flex justify-center">
                      <div className="w-full max-w-md">
                        <PodiumCard
                          entry={revealOrder[total - 1]}
                          rank={1}
                          visible={revealed >= total}
                        />
                      </div>
                    </div>
                  )}

                  {/* 3rd Place - Right */}
                  {total >= 3 && (
                    <div className="flex justify-center">
                      <div className="w-full max-w-md">
                        <PodiumCard
                          entry={revealOrder[total - 3]}
                          rank={3}
                          visible={revealed >= total - 2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rest of the rankings - scrollable list */}
            {total > 3 && (
              <div className="w-full max-w-2xl max-h-96 overflow-y-auto px-2 pb-4">
                {revealOrder
                  .map((entry, idx) => ({ entry, idx, rank: total - idx }))
                  .filter(({ rank }) => rank > 3)
                  .sort((a, b) => a.rank - b.rank)
                  .map(({ entry, idx, rank }) => {
                    const cardVisible = idx < revealed;
                    return (
                      <RestListCard
                        key={entry.id}
                        entry={entry}
                        rank={rank}
                        visible={cardVisible}
                      />
                    );
                  })}
              </div>
            )}
          </>
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
                    revealed <= 1 &&
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
