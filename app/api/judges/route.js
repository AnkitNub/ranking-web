import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

// GET /api/judges
// Returns the list of registered users any host can assign as a judge to
// their event. Available to any signed-in user — hosts need to browse this
// list to invite judges.
export async function GET(request) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, created_at')
    .order('name', { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ judges: data });
}
