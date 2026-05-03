import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

export async function DELETE(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, participantId } = await params;

  // Fetch the participant to confirm it exists and belongs to this event.
  const { data: participant } = await supabaseAdmin
    .from('participants')
    .select('id, event_id')
    .eq('id', participantId)
    .eq('event_id', id)
    .single();

  if (!participant)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch the event to verify ownership and status.
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('admin_id, status')
    .eq('id', id)
    .single();

  if (!event || event.admin_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (event.status !== 'not_started') {
    return NextResponse.json(
      { error: 'Cannot delete participants after event has started' },
      { status: 400 },
    );
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
