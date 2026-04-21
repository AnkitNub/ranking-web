import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

export async function POST(request, { params }) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (authResult.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Verify admin owns the event and get current state
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('admin_id, status, current_participant_id')
    .eq('id', id)
    .single();

  if (!event || event.admin_id !== authResult.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (event.status !== 'active') {
    return NextResponse.json(
      { error: 'Event is not currently active' },
      { status: 400 },
    );
  }

  // Get all participants in order to find next one
  const { data: participants } = await supabaseAdmin
    .from('participants')
    .select('id')
    .eq('event_id', id)
    .order('created_at', { ascending: true });

  if (!participants || participants.length === 0) {
    return NextResponse.json(
      { error: 'No participants found' },
      { status: 400 },
    );
  }

  // Find current index
  const currentIndex = participants.findIndex(
    (p) => p.id === event.current_participant_id,
  );
  const nextIndex = currentIndex + 1;

  let updateData = {
    current_round_start_time: new Date().toISOString(),
    current_judge_index: 0,
    turn_start_time: new Date().toISOString(),
  };

  // If no next participant, end the event
  if (nextIndex >= participants.length) {
    updateData.status = 'ended';
    updateData.current_participant_id = null;
    updateData.current_judge_index = null;
    updateData.turn_start_time = null;
  } else {
    updateData.current_participant_id = participants[nextIndex].id;
  }

  const { data: updatedEvent, error } = await supabaseAdmin
    .from('events')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ event: updatedEvent });
}
