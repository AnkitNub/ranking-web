'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/authFetch';
import { getRemainingRoundTime, formatSeconds } from '@/lib/eventHelpers';
import supabase from '@/lib/supabaseClient';

/* ─── Score Details Modal ──────────────────────────────────────────────────── */
function ScoreDetailsModal({ participant, scores, eventId, onClose }) {
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJudges = async () => {
      try {
        const res = await authFetch(`/api/events/${eventId}/judges`);
        const data = await res.json();
        setJudges(data.judges || []);
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

  const judgeScores = judges
    .map((judge) => {
      const score = participantScores.find((s) => s.judge_id === judge.id);
      return {
        judge_name: judge.name || 'Unknown Judge',
        score: score ? score.score : '-',
      };
    })
    .sort((a, b) => {
      const scoreA = a.score === '-' ? -Infinity : a.score;
      const scoreB = b.score === '-' ? -Infinity : b.score;
      return scoreB - scoreA;
    });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-700 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-black dark:text-white">
            {participant.name} のスコア
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
            審査員を読み込み中...
          </p>
        ) : judgeScores.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center py-4">
            まだ審査員が割り当てられていません。
          </p>
        ) : (
          <div className="space-y-2">
            {judgeScores.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-100 dark:bg-slate-600 px-3 py-2 rounded-lg"
              >
                <span className="text-sm font-medium text-black dark:text-white">
                  {item.judge_name}
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
          閉じる
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
        setError(data.error || 'Failed to delete participant');
      }
    } catch (err) {
      setError('An error occurred while deleting');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          参加者を削除
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          本当に <strong>{participantName}</strong>{' '}
          とそのすべてのスコアを削除しますか？この操作は元に戻せません。
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
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? '削除中…' : '削除'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Participants Tab ─────────────────────────────────────────────────────── */
function ParticipantsTab({ eventId }) {
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
        setError(data.error || 'Failed to add participant.');
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
      <p className="text-sm text-zinc-600 py-6 text-center">読み込み中…</p>
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

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="参加者名"
          className="flex-1 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
        />
        <button
          type="submit"
          disabled={adding || !input.trim()}
          className="rounded-lg bg-teal-600 dark:bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 dark:hover:bg-teal-700 transition disabled:opacity-50"
        >
          {adding ? '…' : '追加'}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {participants.length === 0 ? (
        <p className="text-sm text-zinc-700 text-center py-8">
          まだ参加者がいません。上から追加してください。
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
              <button
                onClick={() => setParticipantToDelete(p)}
                className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition p-1 rounded"
                title="参加者を削除"
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
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-zinc-700">
        全 {participants.length} 人の参加者
      </p>
    </div>
  );
}

/* ─── Judges Tab ───────────────────────────────────────────────────────────── */
function JudgesTab({ eventId }) {
  const [assignedJudges, setAssignedJudges] = useState([]);
  const [allJudges, setAllJudges] = useState([]);
  const [selectedJudgeIds, setSelectedJudgeIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    const [assignedRes, allRes] = await Promise.all([
      authFetch(`/api/events/${eventId}/judges`),
      authFetch('/api/judges'),
    ]);
    const assignedData = await assignedRes.json();
    const allData = await allRes.json();
    setAssignedJudges(assignedData.judges || []);
    setAllJudges(allData.judges || []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const assignedIds = new Set(assignedJudges.map((j) => j.id));
  const unassignedJudges = allJudges.filter((j) => !assignedIds.has(j.id));

  function toggleJudge(judgeId) {
    const newSelected = new Set(selectedJudgeIds);
    if (newSelected.has(judgeId)) {
      newSelected.delete(judgeId);
    } else {
      newSelected.add(judgeId);
    }
    setSelectedJudgeIds(newSelected);
  }

  function toggleAll() {
    if (selectedJudgeIds.size === unassignedJudges.length) {
      setSelectedJudgeIds(new Set());
    } else {
      setSelectedJudgeIds(new Set(unassignedJudges.map((j) => j.id)));
    }
  }

  async function handleAssignSelected() {
    if (selectedJudgeIds.size === 0) return;
    setAssigning(true);
    setError('');
    try {
      const judgeIds = Array.from(selectedJudgeIds);
      const results = await Promise.all(
        judgeIds.map((judge_id) =>
          authFetch(`/api/events/${eventId}/judges`, {
            method: 'POST',
            body: JSON.stringify({ judge_id }),
          }),
        ),
      );

      const failedAssignments = [];
      for (let i = 0; i < results.length; i++) {
        if (!results[i].ok) {
          const data = await results[i].json();
          failedAssignments.push(data.error || 'Unknown error');
        }
      }

      if (failedAssignments.length > 0) {
        setError(`Failed to assign ${failedAssignments.length} judge(s).`);
      }

      setSelectedJudgeIds(new Set());
      await fetchData();
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(judgeId) {
    await authFetch(`/api/events/${eventId}/judges`, {
      method: 'DELETE',
      body: JSON.stringify({ judge_id: judgeId }),
    });
    setAssignedJudges((prev) => prev.filter((j) => j.id !== judgeId));
  }

  if (loading)
    return (
      <p className="text-sm text-zinc-400 py-6 text-center">読み込み中…</p>
    );

  return (
    <div className="space-y-4">
      {/* Available judges to assign */}
      {unassignedJudges.length > 0 ? (
        <>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-700">
            <h3 className="text-sm font-medium text-black dark:text-black">
              利用可能な審査員 ({unassignedJudges.length})
            </h3>
            {unassignedJudges.length > 1 && (
              <button
                onClick={toggleAll}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline transition"
              >
                {selectedJudgeIds.size === unassignedJudges.length
                  ? 'すべて選択解除'
                  : 'すべて選択'}
              </button>
            )}
          </div>

          <ul className="divide-y divide-zinc-200 dark:divide-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-zinc-800">
            {unassignedJudges.map((j) => (
              <li
                key={j.id}
                onClick={() => toggleJudge(j.id)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedJudgeIds.has(j.id)}
                  onChange={() => toggleJudge(j.id)}
                  className="w-4 h-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {j.name}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                    {j.email}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {selectedJudgeIds.size > 0 && (
            <button
              onClick={handleAssignSelected}
              disabled={assigning}
              className="w-full rounded-lg bg-teal-600 dark:bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 dark:hover:bg-teal-700 transition disabled:opacity-50"
            >
              {assigning
                ? '…'
                : `選択した審査員を割り当てる (${selectedJudgeIds.size})`}
            </button>
          )}
        </>
      ) : allJudges.length === 0 ? (
        <p className="text-xs text-zinc-700">
          まだ審査員が登録されていません。審査員に登録を依頼してください。
        </p>
      ) : (
        <p className="text-xs text-zinc-700">
          登録されているすべての審査員が割り当てられています。
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <h3 className="text-sm font-medium text-black dark:text-black pt-2">
        割り当てられた審査員 ({assignedJudges.length})
      </h3>

      {assignedJudges.length === 0 ? (
        <p className="text-sm text-zinc-700 text-center py-6">
          まだ審査員が割り当てられていません。
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-slate-600 border border-zinc-200 dark:border-slate-600 rounded-xl overflow-hidden bg-white dark:bg-slate-700">
          {assignedJudges.map((j) => (
            <li
              key={j.id}
              onClick={() => handleUnassign(j.id)}
              className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-700 hover:bg-zinc-50 dark:hover:bg-slate-600 transition cursor-pointer group"
            >
              <div>
                <p className="text-sm text-slate-900 dark:text-zinc-100 font-medium">
                  {j.name}
                </p>
                <p className="text-xs text-slate-800 dark:text-slate-200">
                  {j.email}
                </p>
              </div>
              <svg
                className="w-4 h-4 text-zinc-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Scoreboard Tab ───────────────────────────────────────────────────────── */
function ScoreboardTab({ eventId }) {
  const [participants, setParticipants] = useState([]);
  const [scores, setScores] = useState([]);
  const [assignedJudgesCount, setAssignedJudgesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const intervalRef = useRef(null);

  const fetchScoreboard = useCallback(async () => {
    const [participantsRes, scoresRes] = await Promise.all([
      authFetch(`/api/events/${eventId}/participants`),
      authFetch(`/api/events/${eventId}/scores`),
    ]);
    const participantsData = await participantsRes.json();
    const scoresData = await scoresRes.json();
    setParticipants(participantsData.participants || []);
    setScores(scoresData.scores || []);
    setAssignedJudgesCount(scoresData.assignedJudgesCount || 0);
    setLastRefreshed(new Date());
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchScoreboard();

    const channel = supabase
      .channel(`admin-scoreboard-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchScoreboard();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchScoreboard();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_judges',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchScoreboard();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchScoreboard, eventId]);

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

  function medalEmoji(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  }

  if (loading)
    return (
      <p className="text-sm text-zinc-600 py-6 text-center">読み込み中…</p>
    );

  return (
    <div className="space-y-3">
      {/* Present Results banner */}
      {allScored && (
        <div className="rounded-xl border-2 border-emerald-600 dark:border-emerald-500 bg-emerald-100 dark:bg-emerald-950/60 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-md">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
              🎉 すべてのスコアが出揃いました！
            </p>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 truncate font-medium">
              {presentUrl}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="text-xs px-3 py-1.5 rounded-lg border-2 border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-100 bg-white dark:bg-emerald-950/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 transition font-bold"
            >
              {copied ? '✓ コピーしました！' : 'リンクをコピー'}
            </button>
            <a
              href={`/present/${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-lg"
            >
              プレゼン画面へ →
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <p className="text-xs text-slate-800 font-medium">
            リアルタイム更新中
            {lastRefreshed &&
              ` · 最終更新 ${lastRefreshed.toLocaleTimeString()}`}
          </p>
        </div>
        <button
          onClick={fetchScoreboard}
          className="text-xs text-slate-800 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 transition"
        >
          ↻ 更新
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-8">
          参加者が追加されていません。
        </p>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-600 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide w-12">
                  順位
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                  参加者
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                  合計スコア
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide hidden sm:table-cell">
                  採点済み審査員
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                  アクション
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
                      表示
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
const TABS = ['参加者', '審査員', 'スコアボード'];

export default function AdminEventPage() {
  const { id } = useParams();
  const router = useRouter();
  const { firebaseUser, supabaseUser, loading } = useAuth();
  const [event, setEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('参加者');
  const [pageLoading, setPageLoading] = useState(true);
  const [participants, setParticipants] = useState([]);

  const fetchEvent = useCallback(async () => {
    try {
      const [eventRes, participantsRes] = await Promise.all([
        authFetch(`/api/events/${id}`),
        authFetch(`/api/events/${id}/participants`),
      ]);

      if (!eventRes.ok) {
        router.replace('/admin');
        return;
      }

      const eventData = await eventRes.json();
      const participantsData = await participantsRes.json();

      setEvent(eventData.event);
      setParticipants(participantsData.participants || []);
      setPageLoading(false);
    } catch (err) {
      console.error('Error fetching event:', err);
      setPageLoading(false);
    }
  }, [id, router]);

  const regeneratePassword = async () => {
    if (
      !confirm('パスワードを再生成しますか？現在のパスワードは無効になります。')
    ) {
      return;
    }
    try {
      const res = await authFetch(`/api/events/${id}/judge-password`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setEvent({ ...event, judge_password: data.judge_password });
        alert('パスワードを再生成しました!');
      } else {
        alert('パスワードの再生成に失敗しました。');
      }
    } catch (err) {
      console.error('Failed to regenerate password:', err);
      alert('エラーが発生しました。');
    }
  };

  const startEvent = async () => {
    if (!confirm('イベントを開始しますか？')) {
      return;
    }
    try {
      const res = await authFetch(`/api/events/${id}/start`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
        alert('イベントが開始されました!');
      } else {
        const data = await res.json();
        alert(data.error || 'イベント開始に失敗しました。');
      }
    } catch (err) {
      console.error('Failed to start event:', err);
      alert('エラーが発生しました。');
    }
  };

  const nextParticipant = async () => {
    try {
      const res = await authFetch(`/api/events/${id}/next-participant`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
        alert(
          data.event.status === 'ended'
            ? 'イベントが終了しました!'
            : '次へ進みました!',
        );
      } else {
        const data = await res.json();
        alert(data.error || '次へ進むに失敗しました。');
      }
    } catch (err) {
      console.error('Failed to advance participant:', err);
      alert('エラーが発生しました。');
    }
  };

  const endEvent = async () => {
    if (!confirm('イベントを終了しますか？')) {
      return;
    }
    try {
      const res = await authFetch(`/api/events/${id}/end`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
        alert('イベントが終了しました!');
      } else {
        const data = await res.json();
        alert(data.error || 'イベント終了に失敗しました。');
      }
    } catch (err) {
      console.error('Failed to end event:', err);
      alert('エラーが発生しました。');
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace('/signin');
      return;
    }
    if (supabaseUser && supabaseUser.role !== 'admin') {
      router.replace('/judge');
      return;
    }
    if (supabaseUser) fetchEvent();
  }, [loading, firebaseUser, supabaseUser, fetchEvent, router]);

  // Poll for event updates when actively running
  useEffect(() => {
    if (!event || event.status !== 'active') return;

    const uiInterval = setInterval(() => {
      // Just trigger re-render for the timer display, instead of fetching
      setEvent((prev) => ({ ...prev }));
    }, 1000);

    return () => clearInterval(uiInterval);
  }, [event?.status]);

  // Listen to postgres changes for real-time sync
  useEffect(() => {
    const channel = supabase
      .channel(`admin-event-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${id}`,
        },
        () => {
          fetchEvent();
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id, fetchEvent]);

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#f9f5ea]">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <span className="text-sm text-zinc-400">読み込み中…</span>
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
            onClick={() => router.push('/admin')}
            className="text-xs text-zinc-700 hover:text-teal-700 dark:hover:text-teal-400 transition mb-2"
          >
            ← マイイベントに戻る
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-black dark:text-black">
              {event?.name}
            </h1>
            {event?.deadline &&
              new Date(event.deadline) <
                new Date(new Date().toDateString()) && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  期限切れ
                </span>
              )}
          </div>
          {event?.event_date && (
            <div className="mt-2 space-y-1">
              <p className="text-base text-zinc-800">
                <strong>開始:</strong>{' '}
                {new Date(event.event_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {event?.start_time && <> {event.start_time}</>}
              </p>
              {event?.deadline && event?.end_time && (
                <p className="text-base text-zinc-800">
                  <strong>終了:</strong>{' '}
                  {new Date(event.deadline).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  {event.end_time}
                </p>
              )}
            </div>
          )}
          {event?.deadline && (
            <p
              className={`text-base mt-0.5 font-medium ${
                new Date(event.deadline) < new Date(new Date().toDateString())
                  ? 'text-red-600 dark:text-red-500'
                  : 'text-amber-600 dark:text-amber-500'
              }`}
            >
              採点期限:{' '}
              {new Date(event.deadline).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
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
              審査員ごとの最大スコア:{' '}
              <strong className="text-green-700 dark:text-green-400">
                {event.max_score}
              </strong>{' '}
              点
            </p>
          )}

          {/* Event Controls - NEW MODE */}
          {event?.status && (
            <div className="mt-6 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    イベントステータス
                  </p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">
                    {event.status === 'not_started' && '未開始'}
                    {event.status === 'active' && '実施中'}
                    {event.status === 'ended' && '終了'}
                  </p>
                </div>
              </div>

              {event.status === 'active' && event.current_participant_id && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    <strong>現在の参加者:</strong>{' '}
                    {/* Find and show current participant name */}
                    {(() => {
                      const currentParticipant = participants?.find(
                        (p) => p.id === event.current_participant_id,
                      );
                      return currentParticipant?.name || 'Loading...';
                    })()}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      残り時間:
                    </p>
                    <div className="font-mono text-lg font-bold text-teal-600 dark:text-teal-400">
                      {formatSeconds(
                        getRemainingRoundTime(
                          event.current_round_start_time,
                          60,
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {event.status === 'not_started' && (
                  <button
                    onClick={() => startEvent()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition text-sm"
                  >
                    イベント開始
                  </button>
                )}

                {event.status === 'active' && (
                  <>
                    <button
                      onClick={() => nextParticipant()}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition text-sm"
                    >
                      次へ
                    </button>
                    <button
                      onClick={() => endEvent()}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition text-sm"
                    >
                      終了
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Guest Judge Access - Unified Card */}
          {event?.judge_password && event?.id && (
            <div className="mt-6 p-5 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/30 border-2 border-purple-300 dark:border-purple-700 rounded-xl shadow-sm">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    🔗 ゲストジャッジアクセス
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 rounded-full font-semibold">
                    共有用
                  </span>
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  ゲストジャッジはこの情報で参加できます
                </p>
              </div>

              <div className="space-y-3">
                {/* Event ID */}
                <div>
                  <label className="text-xs font-semibold text-purple-800 dark:text-purple-200 block mb-1.5">
                    イベントID
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={event.id}
                        readOnly
                        className="w-full font-mono text-sm font-bold bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border-2 border-purple-200 dark:border-purple-600 text-purple-900 dark:text-purple-100 cursor-pointer"
                        onClick={(e) => e.target.select()}
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        navigator.clipboard.writeText(event.id.toString());
                        const btn = e.currentTarget;
                        btn.textContent = '✓ コピー';
                        setTimeout(() => {
                          btn.textContent = 'コピー';
                        }, 2000);
                      }}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition"
                    >
                      コピー
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-semibold text-purple-800 dark:text-purple-200 block mb-1.5">
                    パスワード
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={event.judge_password}
                        readOnly
                        className="w-full font-mono text-sm font-bold bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border-2 border-purple-200 dark:border-purple-600 text-purple-900 dark:text-purple-100 cursor-pointer"
                        onClick={(e) => e.target.select()}
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        navigator.clipboard.writeText(event.judge_password);
                        const btn = e.currentTarget;
                        btn.textContent = '✓ コピー';
                        setTimeout(() => {
                          btn.textContent = 'コピー';
                        }, 2000);
                      }}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition"
                    >
                      コピー
                    </button>
                    <button
                      onClick={() => regeneratePassword()}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-sm transition"
                      title="パスワードを新しく生成します"
                    >
                      🔄 再生成
                    </button>
                  </div>
                </div>

                {/* Copy Both Button */}
                <button
                  onClick={(e) => {
                    const text = `イベントID: ${event.id}\nパスワード: ${event.judge_password}`;
                    navigator.clipboard.writeText(text);
                    const btn = e.currentTarget;
                    btn.textContent = '✓ コピーしました!';
                    setTimeout(() => {
                      btn.textContent = '両方をコピー';
                    }, 2000);
                  }}
                  className="w-full mt-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-sm transition"
                >
                  両方をコピー
                </button>

                {/* Instructions */}
                <div className="mt-3 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-purple-200 dark:border-purple-600">
                  <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">
                    <strong>📋 共有方法:</strong>{' '}
                    この情報をゲストジャッジに伝える。ゲストジャッジがサインインページの「ゲストジャッジ」タブでこの情報を入力してアクセスできます。
                  </p>
                </div>
              </div>
            </div>
          )}
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
                    ? 'border-teal-600 dark:border-teal-400 text-black dark:text-black'
                    : 'border-transparent text-black dark:text-black hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div>
          {activeTab === '参加者' && <ParticipantsTab eventId={id} />}
          {activeTab === '審査員' && <JudgesTab eventId={id} />}
          {activeTab === 'スコアボード' && <ScoreboardTab eventId={id} />}
        </div>
      </main>
    </div>
  );
}
