'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/authFetch';

function isExpired(event) {
  if (!event) return false;

  // Check if scoring deadline (deadline + end_time) has passed
  if (event.deadline && event.end_time) {
    const scoringDeadline = new Date(`${event.deadline}T${event.end_time}`);
    if (new Date() > scoringDeadline) return true;
  }

  return false;
}

function CreateEventModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxScore, setMaxScore] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmedStartTime, setConfirmedStartTime] = useState('');
  const [confirmedEndTime, setConfirmedEndTime] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Event name is required.');
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          event_date: date || null,
          start_time: startTime || null,
          end_time: endTime || null,
          description: description || null,
          deadline: deadline || null,
          max_score: maxScore ? Number(maxScore) : 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create event.');
        return;
      }
      onCreate(data.event);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Create New Event
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spring Championship 2026"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
            />
          </div>

          {/* Event & Scoring Details */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Starting Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                The day your event takes place
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Scoring Deadline
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Judges cannot submit scores after this date.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Starting Time
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
                />
                <button
                  type="button"
                  onClick={() => setConfirmedStartTime(startTime)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    startTime
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                  }`}
                  disabled={!startTime}
                >
                  OK
                </button>
              </div>
              {confirmedStartTime && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  ✓ Selected
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Ending Time
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
                />
                <button
                  type="button"
                  onClick={() => setConfirmedEndTime(endTime)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    endTime
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                  }`}
                  disabled={!endTime}
                >
                  OK
                </button>
              </div>
              {confirmedEndTime && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  ✓ Selected
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Maximum Score per Judge *
            </label>
            <input
              type="number"
              required
              min={1}
              step={1}
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              placeholder="10"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              The highest score each judge can give
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Add any details judges should know…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition resize-none"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteEventModal({ eventId, eventName, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await authFetch(`/api/events/${eventId}`, { method: 'DELETE' });
      onConfirm(eventId);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Delete Event
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Are you sure you want to delete <strong>{eventName}</strong> and all
          its data? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditEventModal({ event, onClose, onEdit }) {
  const [name, setName] = useState(event?.name || '');
  const [date, setDate] = useState(
    event?.event_date
      ? new Date(event.event_date).toISOString().split('T')[0]
      : '',
  );
  const [startTime, setStartTime] = useState(event?.start_time || '');
  const [endTime, setEndTime] = useState(event?.end_time || '');
  const [description, setDescription] = useState(event?.description || '');
  const [deadline, setDeadline] = useState(
    event?.deadline ? new Date(event.deadline).toISOString().split('T')[0] : '',
  );
  const [maxScore, setMaxScore] = useState(event?.max_score || '10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmedStartTime, setConfirmedStartTime] = useState(
    event?.start_time || '',
  );
  const [confirmedEndTime, setConfirmedEndTime] = useState(
    event?.end_time || '',
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Event name is required.');
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`/api/events/${event.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          event_date: date || null,
          start_time: startTime || null,
          end_time: endTime || null,
          description: description || null,
          deadline: deadline || null,
          max_score: maxScore ? Number(maxScore) : 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update event.');
        return;
      }
      onEdit(data.event);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Edit Event
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Event name"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Event Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                The day your event takes place
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Scoring Deadline
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Deadline for judges
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Starting Time
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
                />
                <button
                  type="button"
                  onClick={() => setConfirmedStartTime(startTime)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    startTime
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                  }`}
                  disabled={!startTime}
                >
                  OK
                </button>
              </div>
              {confirmedStartTime && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  ✓ Selected
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Ending Time
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
                />
                <button
                  type="button"
                  onClick={() => setConfirmedEndTime(endTime)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    endTime
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                  }`}
                  disabled={!endTime}
                >
                  OK
                </button>
              </div>
              {confirmedEndTime && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  ✓ Selected
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Maximum Score per Judge *
            </label>
            <input
              type="number"
              required
              min={1}
              step={1}
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              placeholder="10"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              The highest score each judge can give
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Add any details judges should know…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition resize-none"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { firebaseUser, supabaseUser, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [expandedActive, setExpandedActive] = useState(true);
  const [expandedClosed, setExpandedClosed] = useState(true);

  const fetchEvents = useCallback(async () => {
    const res = await authFetch('/api/events');
    const data = await res.json();
    setEvents(data.events || []);
    setPageLoading(false);
  }, []);

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
    if (supabaseUser) fetchEvents();
  }, [loading, firebaseUser, supabaseUser, fetchEvents, router]);

  function handleDelete(eventId) {
    setDeletingEventId(eventId);
  }

  function handleConfirmDelete(eventId) {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }

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
      {showModal && (
        <CreateEventModal
          onClose={() => setShowModal(false)}
          onCreate={(event) => setEvents((prev) => [event, ...prev])}
        />
      )}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onEdit={(updatedEvent) => {
            setEvents((prev) =>
              prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)),
            );
          }}
        />
      )}
      {deletingEventId && (
        <DeleteEventModal
          eventId={deletingEventId}
          eventName={events.find((e) => e.id === deletingEventId)?.name}
          onClose={() => setDeletingEventId(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-900">
              My Events
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-700 mt-0.5">
              {events.length} total ·{' '}
              {events.filter((e) => !isExpired(e)).length} active ·{' '}
              {events.filter((e) => isExpired(e)).length} closed
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition"
          >
            + Create New Event
          </button>
        </div>

        {/* Events grid */}
        {events.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-teal-200 dark:border-zinc-800 rounded-2xl">
            <p className="text-zinc-700 dark:text-zinc-300 text-sm mb-3">
              No events yet.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition"
            >
              Create your first event
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Events Section */}
            {events.filter((e) => !isExpired(e)).length > 0 && (
              <div>
                <button
                  onClick={() => setExpandedActive(!expandedActive)}
                  className="w-full flex items-center justify-between gap-3 mb-4 p-4 rounded-lg bg-teal-100 dark:bg-teal-900 hover:bg-teal-200 dark:hover:bg-teal-800 border border-teal-300 dark:border-teal-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-teal-500 dark:bg-teal-400"></div>
                    <h2 className="text-lg font-semibold text-teal-900 dark:text-teal-100">
                      Active Events (
                      {events.filter((e) => !isExpired(e)).length})
                    </h2>
                  </div>
                  <svg
                    className={`w-5 h-5 text-teal-700 dark:text-teal-300 transition-transform ${expandedActive ? 'rotate-0' : '-rotate-90'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
                {expandedActive && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    {events
                      .filter((e) => !isExpired(e))
                      .map((event) => (
                        <div
                          key={event.id}
                          className={`bg-white dark:bg-zinc-900 rounded-xl border p-5 flex flex-col gap-3 transition cursor-pointer group border-teal-200 dark:border-teal-800/50 hover:border-teal-400 dark:hover:border-teal-700 hover:shadow-md`}
                          onClick={() =>
                            router.push(`/admin/events/${event.id}`)
                          }
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-bold text-zinc-950 dark:text-zinc-100 truncate group-hover:text-zinc-700 dark:group-hover:text-teal-300 transition">
                                  {event.name}
                                </h2>
                              </div>
                              {event.event_date && (
                                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                                  <p className="text-teal-700 dark:text-teal-300 font-semibold uppercase tracking-wide">
                                    Event Time
                                  </p>
                                  <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                                    {new Date(
                                      event.event_date,
                                    ).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                    {' | '}
                                    {event.start_time}
                                  </div>
                                </div>
                              )}
                              {event.deadline && event.end_time && (
                                <div
                                  className={`rounded-lg p-2.5 space-y-1 text-sm bg-teal-50 dark:bg-teal-900/20`}
                                >
                                  <p
                                    className={`font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300 text-xs`}
                                  >
                                    End Time
                                  </p>
                                  <div
                                    className={`text-zinc-800 dark:text-zinc-200 font-medium`}
                                  >
                                    {new Date(
                                      event.deadline,
                                    ).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                    {' | '}
                                    {event.end_time}
                                  </div>
                                </div>
                              )}
                              {event.description && (
                                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                                  <p className="font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300 text-xs">
                                    Description
                                  </p>
                                  <p className="text-zinc-800 dark:text-zinc-200 line-clamp-2">
                                    {event.description}
                                  </p>
                                </div>
                              )}
                              {event.max_score && (
                                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                                  <p className="font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300 text-xs">
                                    Max Score
                                  </p>
                                  <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                                    {event.max_score} pts
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEvent(event);
                                }}
                                className="text-zinc-400 dark:text-zinc-500 hover:text-teal-500 dark:hover:text-teal-400 transition p-1 rounded"
                                title="Edit event"
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(event.id);
                                }}
                                className="text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition p-1 rounded"
                                title="Delete event"
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
                            </div>
                          </div>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            Created{' '}
                            {new Date(event.created_at).toLocaleDateString()}
                          </p>
                          <div className="mt-auto pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <button className="w-full text-sm font-bold px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600 text-white transition">
                              Manage →
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Closed Events Section */}
            {events.filter((e) => isExpired(e)).length > 0 && (
              <div>
                <button
                  onClick={() => setExpandedClosed(!expandedClosed)}
                  className="w-full flex items-center justify-between gap-3 mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 border border-red-300 dark:border-red-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 dark:bg-red-400"></div>
                    <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
                      Closed Events ({events.filter((e) => isExpired(e)).length}
                      )
                    </h2>
                  </div>
                  <svg
                    className={`w-5 h-5 text-red-700 dark:text-red-300 transition-transform ${expandedClosed ? 'rotate-0' : '-rotate-90'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
                {expandedClosed && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    {events
                      .filter((e) => isExpired(e))
                      .map((event) => (
                        <div
                          key={event.id}
                          className={`bg-white dark:bg-zinc-900 rounded-xl border p-5 flex flex-col gap-3 transition cursor-pointer group border-red-200 dark:border-red-800/50 hover:border-red-400 dark:hover:border-red-700`}
                          onClick={() =>
                            router.push(`/admin/events/${event.id}`)
                          }
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-bold text-zinc-950 dark:text-zinc-100 truncate group-hover:text-zinc-700 dark:group-hover:text-red-300 transition">
                                  {event.name}
                                </h2>
                                <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 shrink-0">
                                  Expired
                                </span>
                              </div>
                              {event.event_date && (
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                                  <p className="text-red-700 dark:text-red-300 font-semibold uppercase tracking-wide text-xs">
                                    Event Time
                                  </p>
                                  <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                                    {new Date(
                                      event.event_date,
                                    ).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                    {' | '}
                                    {event.start_time}
                                  </div>
                                </div>
                              )}
                              {event.deadline && event.end_time && (
                                <div
                                  className={`rounded-lg p-2.5 space-y-1 text-sm bg-red-50 dark:bg-red-900/20`}
                                >
                                  <p
                                    className={`font-semibold uppercase tracking-wide text-red-700 dark:text-red-300 text-xs`}
                                  >
                                    End Time
                                  </p>
                                  <div
                                    className={`text-zinc-800 dark:text-zinc-200 font-medium`}
                                  >
                                    {new Date(
                                      event.deadline,
                                    ).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                    {' | '}
                                    {event.end_time}
                                  </div>
                                </div>
                              )}
                              {event.description && (
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                                  <p className="font-semibold uppercase tracking-wide text-red-700 dark:text-red-300 text-xs">
                                    Description
                                  </p>
                                  <p className="text-zinc-800 dark:text-zinc-200 line-clamp-2">
                                    {event.description}
                                  </p>
                                </div>
                              )}
                              {event.max_score && (
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5 space-y-1 text-sm">
                                  <p className="font-semibold uppercase tracking-wide text-red-700 dark:text-red-300 text-xs">
                                    Max Score
                                  </p>
                                  <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                                    {event.max_score} pts
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEvent(event);
                                }}
                                className="text-zinc-400 dark:text-zinc-500 hover:text-teal-500 dark:hover:text-teal-400 transition p-1 rounded"
                                title="Edit event"
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(event.id);
                                }}
                                className="text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition p-1 rounded"
                                title="Delete event"
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
                            </div>
                          </div>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            Created{' '}
                            {new Date(event.created_at).toLocaleDateString()}
                          </p>
                          <div className="mt-auto pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium group-hover:text-red-800 dark:group-hover:text-red-300 transition">
                              View Results →
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
