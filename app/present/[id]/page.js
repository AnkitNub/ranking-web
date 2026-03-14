'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

/* ─── Confetti burst for the winner ───────────────────────────────────────── */
function Confetti() {
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    color: ['#2dd4bf', '#f59e0b', '#a78bfa', '#f472b6', '#34d399', '#fbbf24'][
      Math.floor(Math.random() * 6)
    ],
    size: 6 + Math.random() * 8,
  }));

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
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Rank card ────────────────────────────────────────────────────────────── */
function RankCard({ entry, rank, total, visible }) {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;

  const medal = isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : null;

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border px-6 py-5 flex items-center gap-5
          ${
            isFirst
              ? 'border-amber-400/60 bg-linear-to-r from-amber-950/80 to-stone-900/90 shadow-2xl shadow-amber-500/20'
              : isSecond
                ? 'border-zinc-400/40 bg-linear-to-r from-zinc-800/80 to-stone-900/90 shadow-lg shadow-zinc-500/10'
                : isThird
                  ? 'border-amber-700/40 bg-linear-to-r from-amber-950/60 to-stone-900/90 shadow-lg shadow-amber-800/10'
                  : 'border-zinc-700/40 bg-zinc-900/70 shadow-md'
          }
        `}
      >
        {/* Left accent stripe */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
            isFirst
              ? 'bg-linear-to-b from-amber-300 to-amber-500'
              : isSecond
                ? 'bg-linear-to-b from-zinc-300 to-zinc-500'
                : isThird
                  ? 'bg-linear-to-b from-amber-600 to-amber-800'
                  : 'bg-linear-to-b from-teal-600 to-teal-800'
          }`}
        />

        {/* Rank badge */}
        <div
          className={`shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black
            ${
              isFirst
                ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40'
                : isSecond
                  ? 'bg-zinc-400/10 text-zinc-300 ring-1 ring-zinc-400/30'
                  : isThird
                    ? 'bg-amber-700/20 text-amber-500 ring-1 ring-amber-700/40'
                    : 'bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700'
            }
          `}
        >
          {medal ?? rank}
        </div>

        {/* Name + score */}
        <div className="flex-1 min-w-0">
          <p
            className={`font-bold truncate leading-tight ${
              isFirst
                ? 'text-2xl text-amber-100'
                : isSecond
                  ? 'text-xl text-zinc-100'
                  : isThird
                    ? 'text-xl text-amber-200'
                    : 'text-lg text-zinc-200'
            }`}
          >
            {entry.name}
          </p>
          {isFirst && (
            <p className="text-xs text-amber-400/80 font-semibold uppercase tracking-widest mt-0.5">
              Winner
            </p>
          )}
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <p
            className={`font-black tabular-nums ${
              isFirst
                ? 'text-4xl text-amber-300'
                : isSecond
                  ? 'text-3xl text-zinc-200'
                  : isThird
                    ? 'text-3xl text-amber-400'
                    : 'text-2xl text-zinc-300'
            }`}
          >
            {entry.totalScore}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">pts</p>
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

  const autoRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);

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
  const revealOrder = data ? [...data.ranked].reverse() : [];
  const total = revealOrder.length;
  const allRevealed = revealed >= total;

  // When the final card (rank 1) is revealed, fire confetti
  useEffect(() => {
    if (allRevealed && total > 0) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(t);
    }
  }, [allRevealed, total]);

  // Auto mode ticker
  useEffect(() => {
    if (mode === 'auto' && started && !allRevealed) {
      autoRef.current = setInterval(() => {
        setRevealed((r) => {
          if (r >= total) {
            clearInterval(autoRef.current);
            return r;
          }
          return r + 1;
        });
      }, autoSpeed);
    }
    return () => clearInterval(autoRef.current);
  }, [mode, started, allRevealed, autoSpeed, total]);

  function handleStart() {
    setRevealed(0);
    setStarted(true);
    setShowConfetti(false);
    if (mode === 'manual') {
      setRevealed(1);
    }
  }

  function handleNext() {
    if (revealed < total) setRevealed((r) => r + 1);
  }

  function handlePrev() {
    if (revealed > 1) setRevealed((r) => r - 1);
  }

  function handleReset() {
    clearInterval(autoRef.current);
    setRevealed(0);
    setStarted(false);
    setShowConfetti(false);
  }

  function handleModeToggle(newMode) {
    clearInterval(autoRef.current);
    setMode(newMode);
    setRevealed(0);
    setStarted(false);
    setShowConfetti(false);
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-teal-700 border-t-teal-400 animate-spin" />
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
          <div className="w-16 h-16 rounded-2xl bg-teal-900/30 border border-teal-700/40 flex items-center justify-center mx-auto mb-5">
            <svg
              className="w-8 h-8 text-teal-500"
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
            className="mt-4 text-xs text-teal-500 hover:text-teal-300 transition"
          >
            ↻ Refresh
          </button>
        </div>
      </div>
    );
  }

  /* ── Presentation ── */
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
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
                    ? 'bg-teal-600 text-white shadow'
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
                clearInterval(autoRef.current);
                setAutoSpeed(Number(e.target.value));
                setStarted(false);
                setRevealed(0);
              }}
              className="bg-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1.5 border border-zinc-700 outline-none focus:ring-1 focus:ring-teal-500"
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
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Pre-start screen */}
        {!started ? (
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-teal-500 to-teal-700 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-teal-900/60">
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
            <button
              onClick={handleStart}
              className="px-8 py-3 rounded-xl bg-linear-to-br from-teal-500 to-teal-700 text-white font-bold text-lg hover:from-teal-400 hover:to-teal-600 transition shadow-xl shadow-teal-900/40 active:scale-95"
            >
              Start Presentation
            </button>
          </div>
        ) : (
          <>
            {/* Reveal counter */}
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold mb-6">
              {allRevealed
                ? `All ${total} results revealed`
                : `Revealing rank ${total - revealed + 1} of ${total}`}
            </p>

            {/* Cards — rendered in display order (rank 1 at top) */}
            {/* We show rank 1…revealed from the reveal order reversed back */}
            <div className="w-full max-w-xl space-y-3">
              {revealOrder.map((entry, idx) => {
                const rank = total - idx; // idx 0 = last place = rank total
                const cardVisible = idx < revealed;
                return (
                  <RankCard
                    key={entry.id}
                    entry={entry}
                    rank={rank}
                    total={total}
                    visible={cardVisible}
                  />
                );
              })}
            </div>
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
                disabled={revealed <= 1}
                className="px-4 py-2 rounded-lg border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                onClick={handleNext}
                disabled={allRevealed}
                className="px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold transition disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-teal-900/40"
              >
                {allRevealed ? 'All done 🎉' : 'Next →'}
              </button>
            </div>
          )}

          {mode === 'auto' && (
            <div className="flex items-center gap-2">
              {!allRevealed ? (
                <span className="text-xs text-teal-400 animate-pulse">
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
