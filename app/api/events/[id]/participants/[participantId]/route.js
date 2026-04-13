import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

export async function DELETE(request, { params }) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (authResult.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, participantId } = await params;

  // Verify admin owns the event that this participant belongs to
  const { data: participant } = await supabaseAdmin
    .from('participants')
    .select('event_id, events(admin_id)')
    .eq('id', participantId)
    .single();

  if (!participant)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (
    String(participant.event_id) !== id ||
    participant.events?.admin_id !== authResult.user.id
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete associated scores first to avoid foreign key constraints
  await supabaseAdmin
    .from('scores')
    .delete()
    .eq('participant_id', participantId);

  const { error } = await supabaseAdmin
    .from('participants')
    .delete()
    .eq('id', participantId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
