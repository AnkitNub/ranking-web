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
    return <p className="text-sm text-zinc-400 py-6 text-center">Loading…</p>;

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Participant name"
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition"
        />
        <button
          type="submit"
          disabled={adding || !input.trim()}
          className="rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition disabled:opacity-50"
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
        <p className="text-sm text-zinc-400 text-center py-8">
          No participants yet. Add one above.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900"
            >
              <span className="text-sm text-zinc-900 dark:text-zinc-100">
                {p.name}
              </span>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-zinc-400 hover:text-red-500 transition p-1 rounded"
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
      <p className="text-xs text-zinc-400">
        {participants.length} participant{participants.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

/* ─── Judges Tab ───────────────────────────────────────────────────────────── */
function JudgesTab({ eventId }) {
  const [assignedJudges, setAssignedJudges] = useState([]);
  const [allJudges, setAllJudges] = useState([]);
  const [selectedJudgeId, setSelectedJudgeId] = useState('');
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

  async function handleAssign() {
    if (!selectedJudgeId) return;
    setAssigning(true);
    setError('');
    try {
      const res = await authFetch(`/api/events/${eventId}/judges`, {
        method: 'POST',
        body: JSON.stringify({ judge_id: selectedJudgeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to assign judge.');
        return;
      }
      const judge = allJudges.find((j) => j.id === selectedJudgeId);
      if (judge) setAssignedJudges((prev) => [...prev, judge]);
      setSelectedJudgeId('');
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
      <div className="flex gap-2">
        <select
          value={selectedJudgeId}
          onChange={(e) => setSelectedJudgeId(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition"
        >
          <option value="">Select a judge…</option>
          {unassignedJudges.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name} ({j.email})
            </option>
          ))}
        </select>
        <button
          onClick={handleAssign}
          disabled={assigning || !selectedJudgeId}
          className="rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition disabled:opacity-50 whitespace-nowrap"
        >
          {assigning ? '…' : 'Assign to Event'}
        </button>
      </div>

      {unassignedJudges.length === 0 && allJudges.length > 0 && (
        <p className="text-xs text-zinc-400">
          All registered judges have been assigned.
        </p>
      )}
      {allJudges.length === 0 && (
        <p className="text-xs text-zinc-400">
          No judges registered yet. Ask judges to sign up first.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Assigned Judges ({assignedJudges.length})
      </h3>

      {assignedJudges.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-6">
          No judges assigned yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          {assignedJudges.map((j) => (
            <li
              key={j.id}
              className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900"
            >
              <div>
                <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                  {j.name}
                </p>
                <p className="text-xs text-zinc-400">{j.email}</p>
              </div>
              <button
                onClick={() => handleUnassign(j.id)}
                className="text-zinc-400 hover:text-red-500 transition p-1 rounded text-xs"
                title="Remove judge"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
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

  function medalEmoji(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  }

  if (loading)
    return <p className="text-sm text-zinc-400 py-6 text-center">Loading…</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          Auto-refreshes every 15s
          {lastRefreshed &&
            ` · Last updated ${lastRefreshed.toLocaleTimeString()}`}
        </p>
        <button
          onClick={fetchScoreboard}
          className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition"
        >
          ↻ Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-8">
          No participants added yet.
        </p>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide w-12">
                  Rank
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Participant
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Total Score
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide hidden sm:table-cell">
                  Judges Scored
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900">
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`${index < rows.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''} ${index === 0 ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}
                >
                  <td className="px-4 py-3 text-center font-semibold text-zinc-600 dark:text-zinc-300">
                    {medalEmoji(index)}
                  </td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-zinc-50">
                    {row.totalScore}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        row.judgesScored === assignedJudgesCount &&
                        assignedJudgesCount > 0
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <span className="text-sm text-zinc-400">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {/* Breadcrumb + title */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition mb-2"
          >
            ← Back to My Events
          </button>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {event?.name}
          </h1>
          {event?.event_date && (
            <p className="text-sm text-zinc-400 mt-0.5">
              {new Date(event.event_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
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
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                  activeTab === tab
                    ? 'border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
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
