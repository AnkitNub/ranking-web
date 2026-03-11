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

export { supabaseAdmin };
