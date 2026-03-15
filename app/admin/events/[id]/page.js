'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/authFetch';

/* ─── Participants Tab ─────────────────────────────────────────────────────── */
function ParticipantsTab({ eventId }) {
  const [participants, setParticipants] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

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

  async function handleDelete(participantId) {
    await authFetch(`/api/events/${eventId}/participants/${participantId}`, {
      method: 'DELETE',
    });
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
  }

  if (loading)
    return <p className="text-sm text-zinc-600 py-6 text-center">Loading…</p>;

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Participant name"
          className="flex-1 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
        />
        <button
          type="submit"
          disabled={adding || !input.trim()}
          className="rounded-lg bg-teal-600 dark:bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 dark:hover:bg-teal-700 transition disabled:opacity-50"
        >
          {adding ? '…' : 'Add'}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {participants.length === 0 ? (
        <p className="text-sm text-zinc-700 text-center py-8">
          No participants yet. Add one above.
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
                onClick={() => handleDelete(p.id)}
                className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition p-1 rounded"
                title="Remove participant"
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
        {participants.length} participant{participants.length !== 1 ? 's' : ''}
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
    return <p className="text-sm text-zinc-400 py-6 text-center">Loading…</p>;

  return (
    <div className="space-y-4">
      {/* Available judges to assign */}
      {unassignedJudges.length > 0 ? (
        <>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-700">
            <h3 className="text-sm font-medium text-black dark:text-black">
              Available Judges ({unassignedJudges.length})
            </h3>
            {unassignedJudges.length > 1 && (
              <button
                onClick={toggleAll}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline transition"
              >
                {selectedJudgeIds.size === unassignedJudges.length
                  ? 'Deselect All'
                  : 'Select All'}
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
              {assigning ? '…' : `Assign Selected (${selectedJudgeIds.size})`}
            </button>
          )}
        </>
      ) : allJudges.length === 0 ? (
        <p className="text-xs text-zinc-700">
          No judges registered yet. Ask judges to sign up first.
        </p>
      ) : (
        <p className="text-xs text-zinc-700">
          All registered judges have been assigned.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <h3 className="text-sm font-medium text-black dark:text-black pt-2">
        Assigned Judges ({assignedJudges.length})
      </h3>

      {assignedJudges.length === 0 ? (
        <p className="text-sm text-zinc-700 text-center py-6">
          No judges assigned yet.
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

  function medalEmoji(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  }

  if (loading)
    return <p className="text-sm text-zinc-600 py-6 text-center">Loading…</p>;

  return (
    <div className="space-y-3">
      {/* Present Results banner */}
      {allScored && (
        <div className="rounded-xl border-2 border-emerald-600 dark:border-emerald-500 bg-emerald-100 dark:bg-emerald-950/60 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-md">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
              🎉 All scores are in!
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
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
            <a
              href={`/present/${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-lg"
            >
              Present →
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-800">
          Auto-refreshes every 15s
          {lastRefreshed &&
            ` · Last updated ${lastRefreshed.toLocaleTimeString()}`}
        </p>
        <button
          onClick={fetchScoreboard}
          className="text-xs text-slate-800 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 transition"
        >
          ↻ Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-8">
          No participants added yet.
        </p>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-600 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide w-12">
                  Rank
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                  Participant
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                  Total Score
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-black dark:text-white uppercase tracking-wide hidden sm:table-cell">
                  Judges Scored
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */
const TABS = ['Participants', 'Judges', 'Scoreboard'];

export default function AdminEventPage() {
  const { id } = useParams();
  const router = useRouter();
  const { firebaseUser, supabaseUser, loading } = useAuth();
  const [event, setEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('Participants');
  const [pageLoading, setPageLoading] = useState(true);

  const fetchEvent = useCallback(async () => {
    const res = await authFetch(`/api/events/${id}`);
    if (!res.ok) {
      router.replace('/admin');
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
    if (supabaseUser && supabaseUser.role !== 'admin') {
      router.replace('/judge');
      return;
    }
    if (supabaseUser) fetchEvent();
  }, [loading, firebaseUser, supabaseUser, fetchEvent, router]);

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#f9f5ea]">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <span className="text-sm text-zinc-400">Loading…</span>
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
            ← Back to My Events
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-black dark:text-black">
              {event?.name}
            </h1>
            {event?.deadline &&
              new Date(event.deadline) <
                new Date(new Date().toDateString()) && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  Expired
                </span>
              )}
          </div>
          {event?.event_date && (
            <div className="mt-2 space-y-1">
              <p className="text-base text-zinc-800">
                <strong>Start:</strong>{' '}
                {new Date(event.event_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {event?.start_time && <> at {event.start_time}</>}
              </p>
              {event?.deadline && event?.end_time && (
                <p className="text-base text-zinc-800">
                  <strong>End:</strong>{' '}
                  {new Date(event.deadline).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  at {event.end_time}
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
              Scoring deadline:{' '}
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
              Max score per judge:{' '}
              <strong className="text-green-700 dark:text-green-400">
                {event.max_score}
              </strong>{' '}
              pts
            </p>
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
          {activeTab === 'Participants' && <ParticipantsTab eventId={id} />}
          {activeTab === 'Judges' && <JudgesTab eventId={id} />}
          {activeTab === 'Scoreboard' && <ScoreboardTab eventId={id} />}
        </div>
      </main>
    </div>
  );
}
