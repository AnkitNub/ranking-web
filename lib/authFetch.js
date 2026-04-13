import { auth } from './firebase';

/**
 * Wraps fetch() with the Firebase ID token or guest judge token in the Authorization header.
 * Use this for all client-side calls to protected API routes.
 */
export async function authFetch(url, options = {}) {
  // Check for guest judge session first
  let token = null;
  if (typeof window !== 'undefined') {
    const guestSession = localStorage.getItem('guestJudgeSession');
    if (guestSession) {
      try {
        const session = JSON.parse(guestSession);
        token = session.token;
      } catch (err) {
        console.error('Failed to parse guest session:', err);
      }
    }
  }

  // Fall back to Firebase token if no guest session
  if (!token) {
    token = await auth.currentUser?.getIdToken();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}
