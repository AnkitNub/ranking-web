'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/authFetch';
import { useTranslation } from 'react-i18next';

export default function EditEventPage() {
  const { t } = useTranslation('common');
  const { id } = useParams();
  const router = useRouter();
  const { firebaseUser, supabaseUser, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    event_date: '',
    start_time: '',
    end_time: '',
    deadline: '',
    description: '',
    max_score: '',
    turn_duration_seconds: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  const fetchEvent = useCallback(async () => {
    const res = await authFetch(`/api/events/${id}`);
    if (!res.ok) {
      router.replace('/host');
      return;
    }
    const data = await res.json();
    setEvent(data.event);
    setFormData({
      name: data.event.name || '',
      event_date: data.event.event_date
        ? new Date(data.event.event_date).toISOString().split('T')[0]
        : '',
      start_time: data.event.start_time || '',
      end_time: data.event.end_time || '',
      deadline: data.event.deadline
        ? new Date(data.event.deadline).toISOString().split('T')[0]
        : '',
      description: data.event.description || '',
      max_score: data.event.max_score || '',
      turn_duration_seconds: data.event.turn_duration_seconds || '',
    });
    setPageLoading(false);
  }, [id, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      router.replace('/signin');
      return;
    }
    if (supabaseUser) fetchEvent();
  }, [authLoading, firebaseUser, supabaseUser, fetchEvent, router]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    e.target.setCustomValidity('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await authFetch(`/api/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('failedToUpdateEvent'));
        return;
      }

      setSuccess(t('eventUpdatedSuccessfully'));
      setTimeout(() => router.push(`/host/events/${id}`), 1500);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || pageLoading) {
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
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        {/* Breadcrumb + title */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/host/events/${id}`)}
            className="text-xs text-zinc-700 hover:text-teal-700 dark:hover:text-teal-400 transition mb-3"
          >
            ← {t('backToEvent')}
          </button>
          <h1 className="text-3xl font-semibold text-black dark:text-black">
            {t('editEvent')}
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            {t('updateEventDetails')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t('eventName')}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
              placeholder={t('eventNamePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                {t('eventDate')} *
              </label>
              <input
                type="date"
                name="event_date"
                required
                value={formData.event_date}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                {t('deadline')}
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                {t('startTime')} *
              </label>
              <input
                type="time"
                name="start_time"
                required
                value={formData.start_time}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                {t('endTime')}
              </label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t('description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
              placeholder={t('descriptionPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t('maxScorePerJudge')}
            </label>
            <input
              type="number"
              name="max_score"
              value={formData.max_score}
              onChange={handleChange}
              min="1"
              onInvalid={(e) => {
                const input = e.target;
                if (input.validity.rangeUnderflow) {
                  input.setCustomValidity(t('valueMustBeGreaterThanOrEqual', { min: 1 }));
                } else if (input.validity.stepMismatch) {
                  input.setCustomValidity(t('valueMustBeInteger'));
                } else {
                  input.setCustomValidity('');
                }
              }}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
              placeholder="10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t('turnDurationSeconds')}
            </label>
            <input
              type="number"
              name="turn_duration_seconds"
              value={formData.turn_duration_seconds}
              onChange={handleChange}
              min="1"
              onInvalid={(e) => {
                const input = e.target;
                if (input.validity.rangeUnderflow) {
                  input.setCustomValidity(t('valueMustBeGreaterThanOrEqual', { min: 1 }));
                } else if (input.validity.stepMismatch) {
                  input.setCustomValidity(t('valueMustBeInteger'));
                } else {
                  input.setCustomValidity('');
                }
              }}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 focus:border-teal-300 transition"
              placeholder="60"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {success}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-teal-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('saving') : t('saveChanges')}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/host/events/${id}`)}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
