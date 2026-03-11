'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { supabaseUser, firebaseUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const role = supabaseUser?.role;

  async function handleLogout() {
    await signOut(auth);
    router.push('/signin');
  }

  function navLink(href, label) {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
          active
            ? role === 'judge'
              ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
        }`}
      >
        {label}
      </Link>
    );
  }

  const displayName =
    supabaseUser?.name || firebaseUser?.displayName || firebaseUser?.email;
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
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                role === 'judge'
                  ? 'bg-linear-to-br from-teal-500 to-teal-700'
                  : 'bg-linear-to-br from-zinc-700 to-zinc-900 dark:from-zinc-300 dark:to-zinc-100'
              }`}
            >
              R
            </div>
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              RankIt
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {role === 'admin' && (
              <>
                {navLink('/admin', 'My Events')}
                {navLink('/admin/judges', 'Manage Judges')}
              </>
            )}
            {role === 'judge' && navLink('/judge', 'My Events')}
          </nav>
        </div>

        {/* User info + Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                role === 'judge'
                  ? 'bg-linear-to-br from-teal-500 to-teal-700'
                  : 'bg-linear-to-br from-zinc-600 to-zinc-800 dark:from-zinc-400 dark:to-zinc-200 dark:text-zinc-900'
              }`}
            >
              {initials}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                {displayName}
              </p>
              <p
                className={`text-xs capitalize leading-tight font-medium ${
                  role === 'judge'
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-zinc-400'
                }`}
              >
                {role ?? '…'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {role && (
        <div className="sm:hidden border-t border-zinc-100 dark:border-zinc-800 px-4 py-2 flex gap-2">
          {role === 'admin' && (
            <>
              {navLink('/admin', 'My Events')}
              {navLink('/admin/judges', 'Manage Judges')}
            </>
          )}
          {role === 'judge' && navLink('/judge', 'My Events')}
        </div>
      )}
    </header>
  );
}
