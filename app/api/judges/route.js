import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';
import { getAdminAuth } from '@/lib/firebaseAdmin';

export async function GET(request) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (authResult.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, created_at')
    .eq('role', 'judge')
    .order('name', { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ judges: data });
}

export async function DELETE(request) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (authResult.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { judgeId } = await request.json();
  if (!judgeId)
    return NextResponse.json(
      { error: 'Judge ID is required' },
      { status: 400 },
    );

  // First, get the judge's firebase_uid from Supabase
  const { data: judgeData, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('firebase_uid')
    .eq('id', judgeId)
    .single();

  if (fetchError || !judgeData) {
    return NextResponse.json({ error: 'Judge not found' }, { status: 404 });
  }

  // Try to delete from Firebase Authentication if firebase_uid exists
  if (judgeData.firebase_uid) {
    try {
      const auth = getAdminAuth();
      await auth.deleteUser(judgeData.firebase_uid);
    } catch (firebaseError) {
      // Log the error but continue with Supabase deletion
      // User might not exist in Firebase anymore, that's okay
      console.error('Firebase deletion error:', firebaseError.message);
    }
  }

  // Delete from Supabase
  const { error: supabaseError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', judgeId);

  if (supabaseError)
    return NextResponse.json(
      { error: `Supabase deletion failed: ${supabaseError.message}` },
      { status: 500 },
    );

  return NextResponse.json({ success: true });
}
