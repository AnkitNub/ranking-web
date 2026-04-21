import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

export async function POST(request, { params }) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (authResult.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const { data: event } = await supabaseAdmin
    .from('events')
    .select(
      'admin_id, status, current_judge_index, judges_order, current_participant_id',
    )
    .eq('id', id)
    .single();

  if (!event || event.admin_id !== authResult.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (event.status !== 'active')
    return NextResponse.json({ error: 'Event not active' }, { status: 400 });

  if (
    event.current_judge_index === null ||
    !event.judges_order ||
    event.current_judge_index >= event.judges_order.length
  ) {
    return NextResponse.json(
      { error: 'No judge turn to skip' },
      { status: 400 },
    );
  }

  // Assign a default score of 1 using the admin privilege
  const targetJudge = event.judges_order[event.current_judge_index];
  const scoreData = {
    event_id: id,
    participant_id: event.current_participant_id,
    score: 1,
  };

  if (targetJudge.type === 'user') {
    scoreData.judge_id = targetJudge.id;
  } else if (targetJudge.type === 'guest') {
    scoreData.guest_judge_id = targetJudge.id;
  }

  // Insert default score
  await supabaseAdmin.from('scores').insert(scoreData);

  // Auto advance
  const nextIndex = event.current_judge_index + 1;
  const now = new Date().toISOString();
  let updatePayload = {};

  if (nextIndex >= event.judges_order.length) {
    updatePayload = { current_judge_index: null, turn_start_time: null };
  } else {
    updatePayload = { current_judge_index: nextIndex, turn_start_time: now };
  }

  const { data: updatedEvent, error } = await supabaseAdmin
    .from('events')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: updatedEvent });
}
