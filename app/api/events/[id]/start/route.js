import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

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
    .select('admin_id, status')
    .eq('id', id)
    .single();

  if (!event || event.admin_id !== authResult.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (event.status !== 'not_started') {
    return NextResponse.json(
      { error: 'Event has already been started' },
      { status: 400 },
    );
  }

  // Get first participant
  const { data: participants } = await supabaseAdmin
    .from('participants')
    .select('id')
    .eq('event_id', id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (!participants || participants.length === 0) {
    return NextResponse.json(
      { error: 'No participants found. Add participants before starting.' },
      { status: 400 },
    );
  }

  // Build the judges_order array
  const { data: regularJudgesData } = await supabaseAdmin
    .from('event_judges')
    .select('judge_id, users(name)')
    .eq('event_id', id);

  const { data: guestJudges } = await supabaseAdmin
    .from('guest_judges')
    .select('id, name')
    .eq('event_id', id);

  const judgesOrder = [];

  if (regularJudgesData) {
    regularJudgesData.forEach((rj) => {
      judgesOrder.push({
        id: rj.judge_id,
        type: 'user',
        name: rj.users?.name || 'Judge',
      });
    });
  }

  if (guestJudges) {
    guestJudges.forEach((gj) => {
      judgesOrder.push({
        id: gj.id,
        type: 'guest',
        name: gj.name,
      });
    });
  }

  const firstParticipantId = participants[0].id;
  const now = new Date().toISOString();

  // Update event: set status='active', set current_participant_id, set times, and initialize turn state
  const { data: updatedEvent, error } = await supabaseAdmin
    .from('events')
    .update({
      status: 'active',
      current_participant_id: firstParticipantId,
      current_round_start_time: now,
      started_at: now,
      judges_order: judgesOrder,
      current_judge_index: 0,
      turn_start_time: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    event: updatedEvent,
    participants,
  });
}
