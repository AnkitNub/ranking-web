'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import LiveTurnBanner from '@/components/LiveTurnBanner';
import { authFetch } from '@/lib/authFetch';
import { useEventState } from '@/lib/useEventState';
import { useTranslation } from 'react-i18next';

/* ─── Score Details Modal ──────────────────────────────────────────────────── */
function ScoreDetailsModal({ participant, scores, eventId, onClose }) {
  const { t } = useTranslation('common');
  const [judges, setJudges] = useState([]);
  const [guestJudges, setGuestJudges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJudges = async () => {
      try {
        const res = await authFetch(`/api/events/${eventId}/judges`);
        const data = await res.json();
        setJudges(data.judges || []);
        setGuestJudges(data.guestJudges || []);
      } catch (error) {
        console.error('Failed to fetch judges:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchJudges();
  }, [eventId]);

  const participantScores = scores.filter(
    (s) => s.participant_id === participant.id,
  );

  const regularRows = judges.map((judge) => {
    const score = participantScores.find((s) => s.judge_id === judge.id);
    return {
      key: `user-${judge.id}`,
      judge_name: judge.name || 'Unknown Judge',
      kind: 'judge',
      score: score ? score.score : '-',
    };
  });
  const guestRows = guestJudges.map((g) => {
    const score = participantScores.find((s) => s.guest_judge_id === g.id);
    return {
      key: `guest-${g.id}`,
      judge_name: g.name || 'Guest',
      kind: 'guest',
      score: score ? score.score : '-',
    };
  });
  const judgeScores = [...regularRows, ...guestRows].sort((a, b) => {
    const scoreA = a.score === '-' ? -Infinity : a.score;
    const scoreB = b.score === '-' ? -Infinity : b.score;
    return scoreB - scoreA;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-700 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-black dark:text-white">
            {t('scoresFor', { name: participant.name })}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black dark:hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center py-4">
            {t('loadingJudges')}
          </p>
        ) : judgeScores.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center py-4">
            {t('noJudgesAssigned')}
          </p>
        ) : (
          <div className="space-y-2">
            {judgeScores.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between bg-slate-100 dark:bg-slate-600 px-3 py-2 rounded-lg"
              >
                <span className="text-sm font-medium text-black dark:text-white flex items-center gap-2">
                  {item.judge_name}
                  {item.kind === 'guest' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      {t('guest')}
                    </span>
                  )}
                </span>
                <span
                  className={`text-sm font-bold ${
                    item.score === '-'
                      ? 'text-zinc-500 dark:text-zinc-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {item.score}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-black dark:text-white font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition"
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
}

/* ─── Delete Participant Modal ─────────────────────────────────────────────── */
function DeleteParticipantModal({
  participantId,
  participantName,
  eventId,
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(
        `/api/events/${eventId}/participants/${participantId}`,
        { method: 'DELETE' },
      );
      if (res.ok) {
        onConfirm(participantId);
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || t('failedToDeleteParticipant'));
      }
    } catch (err) {
      setError(t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          {t('deleteParticipant')}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          {t('deleteParticipantConfirm', { name: participantName })}
        </p>
        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? t('deletingDot') : t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Participants Tab ─────────────────────────────────────────────────────── */
function ParticipantsTab({ eventId, canAddParticipants }) {
  const { t } = useTranslation('common');
  const [participants, setParticipants] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [participantToDelete, setParticipantToDelete] = useState(null);

  const fetchParticipants = useCallback(async () => {
    const res = await authFetch(`/api/events/${eventId}/participants`);
    const data = await res.json();
    setParticipants(data.participants || []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setAdding(true);
    setError('');
    try {
      const res = await authFetch(`/api/events/${eventId}/participants`, {
        method: 'POST',
        body: JSON.stringify({ name: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('failedToAddParticipant'));
        return;
      }
      setParticipants((prev) => [...prev, data.participant]);
      setInput('');
    } finally {
      setAdding(false);
    }
  }

  function handleConfirmDeleted(participantId) {
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
  }

  if (loading)
    return (
      <p className="text-sm text-zinc-600 py-6 text-center">{t('loading')}</p>
    );

  return (
    <div className="space-y-4">
      {participantToDelete && (
        <DeleteParticipantModal
          participantId={participantToDelete.id}
          participantName={participantToDelete.name}
          eventId={eventId}
          onClose={() => setParticipantToDelete(null)}
          onConfirm={handleConfirmDeleted}
        />
      )}

      {canAddParticipants ? (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('participantName')}
            className="flex-1 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
          />
          <button
            type="submit"
            disabled={adding || !input.trim()}
            className="rounded-lg bg-teal-600 dark:bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 dark:hover:bg-teal-700 transition disabled:opacity-50"
          >
            {adding ? t('addingDot') : t('addParticipant')}
          </button>
        </form>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {t('cannotAddParticipantsAfterStart')}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {participants.length === 0 ? (
        <p className="text-sm text-zinc-700 text-center py-8">
          {t('noParticipantsYetHelp')}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-slate-600 border border-zinc-200 dark:border-slate-600 rounded-xl overflow-hidden bg-white dark:bg-slate-700">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-700 hover:bg-zinc-50 dark:hover:bg-slate-600 transition"
            >
              <span className="text-sm text-slate-900 dark:text-zinc-100 font-medium">
                {p.name}
              </span>
              {canAddParticipants && (
                <button
                  onClick={() => setParticipantToDelete(p)}
                  className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition p-1 rounded"
                  title={t('deleteParticipant')}
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-zinc-700">
        {t('totalParticipantsLabel', { count: participants.length })}
      </p>
    </div>
  );
}

/* ─── Judges Tab ───────────────────────────────────────────────────────────── */
function JudgesTab({ eventId }) {
  const { t } = useTranslation('common');
  const [guestJudges, setGuestJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    const res = await authFetch(`/api/events/${eventId}/judges`);
    const assignedData = await res.json();
    setGuestJudges(assignedData.guestJudges || []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return (
      <p className="text-sm text-zinc-400 py-6 text-center">{t('loading')}</p>
    );

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {guestJudges.length > 0 && (
        <div className="mt-2">
          <h3 className="text-sm font-medium text-black dark:text-black mb-3">
            {t('guestJudgesLabel', { count: guestJudges.length })}
          </h3>
          <ul className="divide-y divide-zinc-100 dark:divide-slate-600 border border-zinc-200 dark:border-slate-600 rounded-xl overflow-hidden bg-white dark:bg-slate-700">
            {guestJudges.map((gj) => (
              <li
                key={gj.id}
                className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-700 transition"
              >
                <div>
                  <p className="text-sm text-slate-900 dark:text-zinc-100 font-medium">
                    {gj.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('joinedAt', { date: new Date(gj.created_at).toLocaleString() })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── Scoreboard Tab ───────────────────────────────────────────────────────── */
function ScoreboardTab({ eventId, eventName }) {
  const { t } = useTranslation('common');
  const [participants, setParticipants] = useState([]);
  const [scores, setScores] = useState([]);
  const [judges, setJudges] = useState([]);
  const [guestJudges, setGuestJudges] = useState([]);
  const [assignedJudgesCount, setAssignedJudgesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const intervalRef = useRef(null);

  const fetchScoreboard = useCallback(async () => {
    const [participantsRes, scoresRes, judgesRes] = await Promise.all([
      authFetch(`/api/events/${eventId}/participants`),
      authFetch(`/api/events/${eventId}/scores`),
      authFetch(`/api/events/${eventId}/judges`),
    ]);
    const participantsData = await participantsRes.json();
    const scoresData = await scoresRes.json();
    const judgesData = await judgesRes.json();
    setParticipants(participantsData.participants || []);
    setScores(scoresData.scores || []);
    setJudges(judgesData.judges || []);
    setGuestJudges(judgesData.guestJudges || []);
    setAssignedJudgesCount(scoresData.assignedJudgesCount || 0);
    setLastRefreshed(new Date());
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchScoreboard();
    intervalRef.current = setInterval(fetchScoreboard, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchScoreboard]);

  // Compute ranked rows
  const rows = participants.map((p) => {
    const participantScores = scores.filter((s) => s.participant_id === p.id);
    const totalScore = participantScores.reduce((sum, s) => sum + s.score, 0);
    const judgesScored = participantScores.length;
    return { ...p, totalScore, judgesScored };
  });
  rows.sort((a, b) => b.totalScore - a.totalScore);

  const allScored =
    assignedJudgesCount > 0 &&
    rows.length > 0 &&
    rows.every((r) => r.judgesScored === assignedJudgesCount);

  const presentUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/present/${eventId}`
      : `/present/${eventId}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(presentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: ignore */
    }
  }

  function handleDownloadCsv() {
    const escape = (val) => {
      if (val == null) return '';
      const s = String(val);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const judgeColumns = [
      ...judges.map((j) => ({ kind: 'user', id: j.id, label: j.name })),
      ...guestJudges.map((g) => ({
        kind: 'guest',
        id: g.id,
        label: g.name,
      })),
    ];

    const header = [
      t('rankLabel'),
      t('participantLabel'),
      t('totalScoreLabel'),
      t('scoredJudgesLabel'),
      ...judgeColumns.map((c) => c.label),
    ];

    const lines = [header.map(escape).join(',')];
    rows.forEach((row, idx) => {
      const cells = [
        idx + 1,
        row.name,
        row.totalScore,
        `${row.judgesScored}/${assignedJudgesCount}`,
        ...judgeColumns.map((col) => {
          const score = scores.find(
            (s) =>
              s.participant_id === row.id &&
              (col.kind === 'user'
                ? s.judge_id === col.id
                : s.guest_judge_id === col.id),
          );
          return score ? score.score : '';
        }),
      ];
      lines.push(cells.map(escape).join(','));
    });

    const csv = '﻿' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const safeName = (eventName || `event-${eventId}`)
      .replace(/[^\w　-鿿\-]+/g, '_')
      .slice(0, 60);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}-scoreboard-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function medalEmoji(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  }

  if (loading)
    return (
      <p className="text-sm text-zinc-600 py-6 text-center">{t('loading')}</p>
    );

  const hasAnyScore = scores.length > 0;
  const bannerColor = allScored
    ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-100 dark:bg-emerald-950/60'
    : 'border-teal-500 dark:border-teal-500 bg-teal-50 dark:bg-teal-950/40';
  const bannerHeading = allScored
    ? t('allScoresReady')
    : t('presentationReady');

  return (
    <div className="space-y-3">
      {/* Present Results banner — always available, even mid-event */}
      <div
        className={`rounded-xl border-2 ${bannerColor} px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-md`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
            {bannerHeading}
          </p>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 truncate font-medium">
            {presentUrl}
          </p>
          {!allScored && (
            <p className="text-[11px] text-zinc-700 dark:text-zinc-300 mt-1">
              {t('presentationLiveHelp')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={handleCopyLink}
            className="text-xs px-3 py-1.5 rounded-lg border-2 border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-100 bg-white dark:bg-emerald-950/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 transition font-bold"
          >
            {copied ? t('copied') : t('copyLink')}
          </button>
          <a
            href={`/present/${eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-lg"
          >
            {t('goToPresent')}
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-slate-800">
          {t('autoRefreshEvery15s')}
          {lastRefreshed && ` · ${t('lastRefreshedAt', { time: lastRefreshed.toLocaleTimeString() })}`}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCsv}
            disabled={!hasAnyScore}
            className="text-xs px-3 py-1.5 rounded-lg border-2 border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-400 bg-white dark:bg-zinc-900 hover:bg-teal-50 dark:hover:bg-zinc-800 transition font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
            title={t('downloadCsvHelp')}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3"
              />
            </svg>
            {t('downloadCsv')}
          </button>
          <button
            onClick={fetchScoreboard}
            className="text-xs text-slate-800 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 transition"
          >
            ↻ {t('refresh')}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-8">
          {t('noParticipantsAdded')}
        </p>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-600 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide w-12">
                  {t('rankLabel')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                  {t('participantLabel')}
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                  {t('totalScoreLabel')}
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide hidden sm:table-cell">
                  {t('scoredJudgesLabel')}
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-700">
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`${index < rows.length - 1 ? 'border-b border-slate-200 dark:border-slate-600' : ''} ${index === 0 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
                >
                  <td className="px-4 py-3 text-center font-semibold text-black dark:text-white">
                    {medalEmoji(index)}
                  </td>
                  <td className="px-4 py-3 text-black dark:text-white font-medium">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-black dark:text-white">
                    {row.totalScore}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        row.judgesScored === assignedJudgesCount &&
                        assignedJudgesCount > 0
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-slate-100'
                      }`}
                    >
                      {row.judgesScored}/{assignedJudgesCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedParticipant(row)}
                      className="text-xs px-2 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold transition"
                    >
                      {t('show')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedParticipant && (
        <ScoreDetailsModal
          participant={selectedParticipant}
          scores={scores}
          eventId={eventId}
          onClose={() => setSelectedParticipant(null)}
        />
      )}
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */
const TABS = ['tabParticipants', 'tabJudges', 'tabScoreboard'];

export default function AdminEventPage() {
  const { t } = useTranslation('common');
  const { id } = useParams();
  const router = useRouter();
  const { firebaseUser, supabaseUser, loading } = useAuth();
  const [event, setEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('tabParticipants');
  const [pageLoading, setPageLoading] = useState(true);
  const [startBusy, setStartBusy] = useState(false);
  const { state: liveState, refetch: refetchLive } = useEventState(id);

  async function handleStart() {
    setStartBusy(true);
    try {
      const res = await authFetch(`/api/events/${id}/start`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errMsg = data.message ? t(data.message) : (data.error || res.status);
        alert(t('failedToStart', { error: errMsg }));
      }
      refetchLive();
    } finally {
      setStartBusy(false);
    }
  }


  const fetchEvent = useCallback(async () => {
    const res = await authFetch(`/api/events/${id}`);
    if (!res.ok) {
      router.replace('/host');
      return;
    }
    const data = await res.json();
    setEvent(data.event);
    setPageLoading(false);
  }, [id, router]);

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace('/signin');
      return;
    }
    if (supabaseUser) fetchEvent();
  }, [loading, firebaseUser, supabaseUser, fetchEvent, router]);

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#f9f5ea]">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <span className="text-sm text-zinc-400">{t('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#f9f5ea]">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {/* Breadcrumb + title */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/host')}
            className="text-xs text-zinc-700 hover:text-teal-700 dark:hover:text-teal-400 transition mb-2"
          >
            ← {t('backToMyEvents')}
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-black dark:text-black">
              {event?.name}
            </h1>
            {event?.expires_at && new Date(event.expires_at) < new Date() && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {t('expired')}
              </span>
            )}
          </div>
          {event?.event_date && (
            <div className="mt-2 space-y-1">
              <p className="text-base text-zinc-800">
                <strong>{t('start')}:</strong>{' '}
                {new Date(event.event_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {event?.start_time && <> {event.start_time}</>}
              </p>
            </div>
          )}
          {event?.expires_at && (
            <p
              className={`text-sm mt-0.5 font-medium ${
                new Date(event.expires_at) < new Date()
                  ? 'text-red-600 dark:text-red-500'
                  : 'text-zinc-600 dark:text-zinc-500'
              }`}
            >
              <strong>{t('expiration')}:</strong>{' '}
              {new Date(event.expires_at).toLocaleString('en-US', {
                timeZone: 'Asia/Tokyo',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
              })}
            </p>
          )}
          {event?.description && (
            <p className="text-base text-slate-900 dark:text-zinc-400 mt-1 max-w-2xl">
              {event.description}
            </p>
          )}
          {event?.max_score && (
            <p className="text-sm text-zinc-800 mt-1">
              {t('maxScorePerJudge')}:{' '}
              <strong className="text-green-700 dark:text-green-400">
                {event.max_score}
              </strong>{' '}
              {t('points')}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-6">
            {event?.event_code && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-800 font-medium">
                  {t('eventCode')}:
                </span>
                <div className="flex items-center border border-zinc-300 dark:border-zinc-700 rounded-md overflow-hidden bg-white dark:bg-zinc-800 shadow-sm">
                  <code className="px-3 py-1.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 select-all bg-zinc-50 dark:bg-zinc-800/50">
                    {event.event_code}
                  </code>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(event.event_code)
                    }
                    className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition border-l border-zinc-300 dark:border-zinc-700"
                    title={t('copyEventCode')}
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
                        strokeWidth="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {event?.judge_password && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-800 font-medium">
                  {t('judgePassword')}:
                </span>
                <div className="flex items-center border border-zinc-300 dark:border-zinc-700 rounded-md overflow-hidden bg-white dark:bg-zinc-800 shadow-sm">
                  <code className="px-3 py-1.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 select-all bg-zinc-50 dark:bg-zinc-800/50">
                    {event.judge_password}
                  </code>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(event.judge_password)
                    }
                    className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition border-l border-zinc-300 dark:border-zinc-700"
                    title={t('copyJudgePassword')}
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
                        strokeWidth="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live turn control */}
        <div className="mb-6">
          <LiveTurnBanner
            eventId={id}
            state={liveState}
            onStart={handleStart}
            startBusy={startBusy}
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 mb-6">
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-base font-medium border-b-2 transition -mb-px ${
                  activeTab === tab
                    ? 'border-teal-600 dark:border-teal-400 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {t(tab)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'tabParticipants' && (
            <ParticipantsTab
              eventId={id}
              canAddParticipants={
                (liveState?.status || event?.status) === 'not_started'
              }
            />
          )}
          {activeTab === 'tabJudges' && <JudgesTab eventId={id} />}
          {activeTab === 'tabScoreboard' && (
            <ScoreboardTab eventId={id} eventName={event?.name} />
          )}
        </div>
      </main>
    </div>
  );
}
