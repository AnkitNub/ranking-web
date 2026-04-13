import { createClient } from '@supabase/supabase-js';
import { getAdminAuth } from './firebaseAdmin';
import jwt from 'jsonwebtoken';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const JWT_SECRET =
  process.env.GUEST_JUDGE_JWT_SECRET || 'your-secret-key-change-me';

/**
 * Verifies the Bearer token in the Authorization header and returns the
 * corresponding user object (either Firebase user or guest judge).
 * Returns { type: 'firebase' | 'guest', user: userData } or null if unauthenticated.
 */
export async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  // Try Firebase auth first
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const { data } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('firebase_uid', decoded.uid)
      .single();
    if (data) {
      return { type: 'firebase', user: data };
    }
  } catch (err) {
    // Not a Firebase token, try guest judge token
  }

  // Try guest judge token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.guest_judge_id) {
      // Fetch guest judge data
      const { data: guestJudge } = await supabaseAdmin
        .from('guest_judges')
        .select('*')
        .eq('id', decoded.guest_judge_id)
        .single();

      if (guestJudge) {
        return {
          type: 'guest',
          user: {
            id: guestJudge.id,
            name: guestJudge.name,
            event_id: guestJudge.event_id,
            role: 'guest_judge',
          },
        };
      }
    }
  } catch (err) {
    // Not a valid token
  }

  return null;
}

export { supabaseAdmin, JWT_SECRET };
