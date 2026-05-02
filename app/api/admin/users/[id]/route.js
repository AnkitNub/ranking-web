import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';
import { getAdminAuth } from '@/lib/firebaseAdmin';

export async function DELETE(request, { params }) {
  const { id } = await params;
  const adminUser = await getAuthenticatedUser(request);

  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (adminUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (adminUser.id === parseInt(id)) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  // 1. Get the user's firebase_uid from Supabase
  const { data: targetUser, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('firebase_uid')
    .eq('id', id)
    .single();

  if (fetchError || !targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 2. Delete from Firebase
  try {
    const auth = await getAdminAuth();
    await auth.deleteUser(targetUser.firebase_uid);
  } catch (err) {
    console.error('Firebase delete user error:', err);
    // Continue anyway if Firebase user not found?
    // If it's an auth/user-not-found error, we should proceed to delete from DB
    if (err.code !== 'auth/user-not-found') {
      return NextResponse.json({ error: `Firebase error: ${err.message}` }, { status: 500 });
    }
  }

  // 3. Delete from Supabase
  const { error: dbError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', id);

  if (dbError) {
    console.error('Delete user error:', dbError);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
