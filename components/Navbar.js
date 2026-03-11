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
        className={`text-sm transition ${
          active
            ? 'text-zinc-900 dark:text-zinc-50 font-medium'
            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo + Nav */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50 shrink-0"
          >
            RankIt
          </Link>

          <nav className="hidden sm:flex items-center gap-5">
            {role === 'admin' && (
              <>
                {navLink('/admin', 'My Events')}
                {navLink('/admin/judges', 'Manage Judges')}
              </>
            )}
            {role === 'judge' && navLink('/judge', 'My Assigned Events')}
          </nav>
        </div>

        {/* User info + Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
              {supabaseUser?.name ||
                firebaseUser?.displayName ||
                firebaseUser?.email}
            </p>
            <p className="text-xs text-zinc-400 capitalize leading-tight">
              {role ?? '…'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {role && (
        <div className="sm:hidden border-t border-zinc-100 dark:border-zinc-800 px-4 py-2 flex gap-4">
          {role === 'admin' && (
            <>
              {navLink('/admin', 'My Events')}
              {navLink('/admin/judges', 'Manage Judges')}
            </>
          )}
          {role === 'judge' && navLink('/judge', 'My Assigned Events')}
        </div>
      )}
    </header>
  );
}
