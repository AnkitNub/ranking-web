import { createClient } from '@supabase/supabase-js';
import { getAdminAuth } from './firebaseAdmin';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/**
 * Verifies the Bearer token in the Authorization header and returns the
 * corresponding Supabase user row, or null if unauthenticated.
 */
export async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const { data } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('firebase_uid', decoded.uid)
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Extracts and returns guest session data from the guest_session cookie.
 * Ensures the guest is accessing an event they are allowed to.
 */
export function getGuestUser(request) {
  // Try header first (for tab-level isolation via sessionStorage)
  const guestHeader = request.headers.get('X-Guest-Session');
  const guestCookie = request.cookies.get('guest_session');
  
  const sessionValue = guestHeader || guestCookie?.value;
  if (!sessionValue) return null;

  try {
    const session = JSON.parse(sessionValue);
    if (!session.guest_judge_id || !session.event_id) return null;
    return {
      role: 'guest_judge',
      id: session.guest_judge_id,
      event_id: session.event_id,
      name: session.name,
    };
  } catch {
    return null;
  }
}

export { supabaseAdmin };
