'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { authFetch } from '@/lib/authFetch';
import { useTranslation } from 'react-i18next';

export default function AdminDashboard() {
  const { t } = useTranslation('common');
  const { supabaseUser, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events'); // 'events' or 'users'

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, eventsRes] = await Promise.all([
        authFetch('/api/admin/users'),
        authFetch('/api/admin/events'),
      ]);

      if (usersRes.status === 403 || eventsRes.status === 403) {
        router.replace('/');
        return;
      }

      const usersData = await usersRes.json();
      const eventsData = await eventsRes.json();

      setUsers(usersData.users || []);
      setEvents(eventsData.events || []);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setPageLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (loading) return;
    if (!supabaseUser || supabaseUser.role !== 'admin') {
      router.replace('/');
      return;
    }
    fetchData();
  }, [loading, supabaseUser, fetchData, router]);

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#f9f5ea]">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-teal-200 border-t-teal-600 animate-spin" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  const ongoingEvents = events.filter(e => e.status === 'active');
  const upcomingEvents = events.filter(e => e.status === 'not_started');
  const endedEvents = events.filter(e => e.status === 'ended');

  return (
    <div className="min-h-screen bg-[#f9f5ea] dark:bg-[#f9f5ea]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-900">
            {t('adminDashboard')}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-700 mt-1">
            {t('manageGlobalState')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('totalUsers')}</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{users.length}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('ongoingEvents')}</p>
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400 mt-1">{ongoingEvents.length}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('totalEvents')}</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{events.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-6 w-full max-w-md">
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 text-sm py-2 px-4 rounded-lg transition font-medium ${
              activeTab === 'events'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {t('allEvents')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 text-sm py-2 px-4 rounded-lg transition font-medium ${
              activeTab === 'users'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {t('allUsers')}
          </button>
        </div>

        {activeTab === 'events' ? (
          <div className="space-y-6">
            {/* Ongoing Section */}
            {ongoingEvents.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  {t('ongoingEvents')}
                </h2>
                <div className="grid gap-4">
                  {ongoingEvents.map(event => (
                    <EventRow key={event.id} event={event} t={t} router={router} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Section */}
            {upcomingEvents.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-900 mb-4">
                  {t('upcomingEvents')}
                </h2>
                <div className="grid gap-4">
                  {upcomingEvents.map(event => (
                    <EventRow key={event.id} event={event} t={t} router={router} />
                  ))}
                </div>
              </section>
            )}

            {/* Ended Section */}
            {endedEvents.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-900 mb-4">
                  {t('endedEvents')}
                </h2>
                <div className="grid gap-4">
                  {endedEvents.map(event => (
                    <EventRow key={event.id} event={event} t={t} router={router} />
                  ))}
                </div>
              </section>
            )}

            {events.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <p className="text-zinc-500 dark:text-zinc-400">{t('noEventsFound')}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('userName')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('userEmail')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('userRole')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('joinedDate')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 text-xs font-bold">
                            {user.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EventRow({ event, t, router }) {
  const hostName = event.users?.name || 'Unknown';
  
  return (
    <div 
      onClick={() => router.push(`/host/events/${event.id}`)}
      className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-teal-400 dark:hover:border-teal-700 transition cursor-pointer group"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-teal-600 transition">
              {event.name}
            </h3>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
              event.status === 'active' 
                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400'
                : event.status === 'ended'
                ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
            }`}>
              {t(event.status)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{t('eventHost')}:</span> {hostName}
            </span>
            {event.event_date && (
              <span className="flex items-center gap-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{t('date')}:</span> {new Date(event.event_date).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{t('eventCode')}:</span> {event.event_code}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">{t('createdAt')}</p>
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{new Date(event.created_at).toLocaleDateString()}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-teal-500 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/20 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
