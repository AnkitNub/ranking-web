import { auth } from './firebase';

/**
 * Wraps fetch() with the Firebase ID token in the Authorization header.
 * Use this for all client-side calls to protected API routes.
 */
export async function authFetch(url, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Guest session for tab-level isolation
  if (typeof window !== 'undefined') {
    const guestSession = sessionStorage.getItem('guest_session');
    if (guestSession) {
      headers['X-Guest-Session'] = encodeURIComponent(guestSession);
    }
  }

  return fetch(url, { ...options, headers });
}
