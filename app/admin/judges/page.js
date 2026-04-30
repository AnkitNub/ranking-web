'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/authFetch';
import { useTranslation } from 'react-i18next';

export default function ManageJudgesPage() {
  const { t } = useTranslation('common');
  const { firebaseUser, supabaseUser, loading } = useAuth();
  const router = useRouter();
  const [judges, setJudges] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchJudges = useCallback(async () => {
    const res = await authFetch('/api/judges');
    const data = await res.json();
    setJudges(data.judges || []);
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
    if (supabaseUser) fetchJudges();
  }, [loading, firebaseUser, supabaseUser, fetchJudges, router]);

  const handleDeleteJudge = async (judgeId, judgeName) => {
    setDeleting(judgeId);
    setDeleteError('');

    try {
      const res = await authFetch('/api/judges', {
        method: 'DELETE',
        body: JSON.stringify({ judgeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || t('failedToDeleteJudge'));
        setDeleting(null);
        return;
      }

      setJudges(judges.filter((j) => j.id !== judgeId));
      setConfirmDelete(null);
    } catch (error) {
      setDeleteError(t('errorDeletingJudge', { message: error.message }));
      setDeleting(null);
    }
  };

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
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-900">
            {t('registeredJudges')}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-700 mt-0.5">
            {t('registeredJudgesHelp')}
          </p>
        </div>

        {deleteError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {deleteError}
          </div>
        )}

        {judges.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-teal-200 dark:border-zinc-800 rounded-2xl">
            <p className="text-zinc-700 dark:text-zinc-300 text-sm">
              {t('noRegisteredJudges')}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {t('judgesAppearAfterSignup')}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    {t('name')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    {t('emailAddress')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide hidden sm:table-cell">
                    {t('joinedDate')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {judges.map((judge, i) => (
                  <tr
                    key={judge.id}
                    className={`${i < judges.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">
                      {judge.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {judge.email}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 dark:text-zinc-500 text-xs hidden sm:table-cell">
                      {new Date(judge.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmDelete(judge.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium transition"
                        disabled={deleting === judge.id}
                      >
                        {deleting === judge.id ? t('deleting') : t('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-sm w-full p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                {t('deleteJudgeConfirmTitle')}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                {t('deleteJudgeConfirmHelp')}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  disabled={deleting === confirmDelete}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() =>
                    handleDeleteJudge(
                      confirmDelete,
                      judges.find((j) => j.id === confirmDelete)?.name,
                    )
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  disabled={deleting === confirmDelete}
                >
                  {deleting === confirmDelete ? t('deleting') : t('delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
