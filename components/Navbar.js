'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';

export default function Navbar() {
  const { t } = useTranslation('common');
  const { supabaseUser, firebaseUser, guestUser, loading, setGuestUser, setSupabaseUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  async function handleLogout() {
    if (firebaseUser) {
      await signOut(auth);
    }
    // Clear guest session
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('guest_session');
      // Clearing cookie by setting expiration in the past
      document.cookie = 'guest_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    setGuestUser(null);
    setSupabaseUser(null);
    router.push('/signin');
  }

  function navLink(href, label) {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        className={`relative px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-full ${
          active
            ? 'text-teal-700 dark:text-teal-400 bg-teal-50/80 dark:bg-teal-900/30'
            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
        }`}
      >
        {label}
      </Link>
    );
  }

  const displayName =
    supabaseUser?.name ||
    firebaseUser?.displayName ||
    firebaseUser?.email ||
    guestUser?.name;
    
  const initials = displayName
    ? displayName
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md supports-backdrop-filter:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-6">
        {/* Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold bg-linear-to-br from-teal-500 to-teal-700 shadow-sm group-hover:shadow group-hover:scale-105 transition-all duration-300">
              R
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400">
              RankIt
            </span>
          </Link>

          {!loading && firebaseUser && (
            <nav className="hidden sm:flex items-center gap-2">
              {navLink('/host', t('myEvents'))}
              {supabaseUser?.role === 'admin' && navLink('/admin', t('dashboard'))}
              {supabaseUser?.role !== 'admin' && navLink('/judge', t('judgingEvents'))}
            </nav>
          )}
        </div>

        {/* User info + Logout + Language Toggle */}
        <div className="flex items-center gap-4">
          {!loading && (firebaseUser || guestUser) && (
            <>
              <div className="flex items-center gap-3 mr-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-linear-to-br from-teal-500 to-teal-700 shadow-sm">
                  {initials}
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                    {displayName}
                  </p>
                </div>
              </div>

              {(firebaseUser || guestUser) && (
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-zinc-200 dark:border-zinc-700 px-4 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-300 order-last sm:order-none shadow-sm hover:shadow"
                >
                  {t('logout')}
                </button>
              )}
            </>
          )}

          {!loading && !firebaseUser && !guestUser && (
            <div className="flex items-center gap-3">
              {pathname !== '/signin' && (
                <Link
                  href="/signin"
                  className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
                >
                  {t('login')}
                </Link>
              )}
              {pathname !== '/signup' && (
                <Link
                  href="/signup"
                  className="rounded-full bg-teal-600 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-700 shadow-sm hover:shadow transition-all duration-300 hover:-translate-y-0.5"
                >
                  {t('signup')}
                </Link>
              )}
            </div>
          )}

          <div className="pl-2 border-l border-zinc-200 dark:border-zinc-800">
            <LanguageToggle />
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {!loading && firebaseUser && (
        <div className="sm:hidden border-t border-zinc-200/60 dark:border-zinc-800/60 px-4 py-3 flex gap-2 overflow-x-auto">
          {navLink('/host', t('myEvents'))}
          {supabaseUser?.role === 'admin' && navLink('/admin', t('dashboard'))}
          {supabaseUser?.role !== 'admin' && navLink('/judge', t('judgingEvents'))}
        </div>
      )}
    </header>
  );
}
