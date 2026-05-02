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
        className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
          active
            ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
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
    <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur supports-backdrop-filter:bg-white/80">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo + Nav */}
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-linear-to-br from-teal-500 to-teal-700">
              R
            </div>
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              RankIt
            </span>
          </Link>

          {!loading && firebaseUser && (
            <nav className="hidden sm:flex items-center gap-1">
              {supabaseUser?.role === 'admin' && navLink('/admin', t('admin'))}
              {navLink('/host', t('hostedEvents'))}
              {navLink('/judge', t('judgingEvents'))}
            </nav>
          )}
        </div>

        {/* User info + Logout + Language Toggle */}
        <div className="flex items-center gap-3">
          {!loading && (firebaseUser || guestUser) && (
            <>
              <div className="flex items-center gap-2.5 mr-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-linear-to-br from-teal-500 to-teal-700">
                  {initials}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                    {displayName}
                  </p>
                </div>
              </div>

              {(firebaseUser || guestUser) && (
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition order-last sm:order-none"
                >
                  {t('logout')}
                </button>
              )}
            </>
          )}

          {!loading && !firebaseUser && !guestUser && (
            <div className="flex items-center gap-2">
              {pathname !== '/signin' && (
                <Link
                  href="/signin"
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition"
                >
                  {t('login')}
                </Link>
              )}
              {pathname !== '/signup' && (
                <Link
                  href="/signup"
                  className="rounded-lg bg-teal-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-teal-700 transition"
                >
                  {t('signup')}
                </Link>
              )}
            </div>
          )}

          <LanguageToggle />
        </div>
      </div>

      {/* Mobile nav */}
      {!loading && firebaseUser && (
        <div className="sm:hidden border-t border-zinc-100 dark:border-zinc-800 px-4 py-2 flex gap-2">
          {supabaseUser?.role === 'admin' && navLink('/admin', t('admin'))}
          {navLink('/host', t('hostedEvents'))}
          {navLink('/judge', t('judgingEvents'))}
        </div>
      )}
    </header>
  );
}
