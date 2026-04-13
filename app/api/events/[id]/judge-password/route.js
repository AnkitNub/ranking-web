import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';
import { generatePassword } from '@/lib/passwordGenerator';

export async function POST(request, { params }) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (authResult.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Verify admin owns the event
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('admin_id')
    .eq('id', id)
    .single();

  if (!event || event.admin_id !== authResult.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const newPassword = generatePassword();

  const { data: updatedEvent, error } = await supabaseAdmin
    .from('events')
    .update({ judge_password: newPassword })
    .eq('id', id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    judge_password: updatedEvent.judge_password,
  });
}
