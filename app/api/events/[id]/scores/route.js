import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

export async function GET(request, { params }) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // All scores for this event (used by both scoreboard and judge scoring page)
  const { data: scores, error } = await supabaseAdmin
    .from('scores')
    .select('id, participant_id, judge_id, guest_judge_id, score')
    .eq('event_id', id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Count of assigned judges
  const { count: assignedJudgesCount } = await supabaseAdmin
    .from('event_judges')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id);

  // For judges: also surface their own scores separately for easy lookup
  let myScores = [];
  if (authResult.type === 'firebase') {
    myScores = scores.filter((s) => s.judge_id === authResult.user.id);
  } else if (authResult.type === 'guest') {
    myScores = scores.filter((s) => s.guest_judge_id === authResult.user.id);
  }

  return NextResponse.json({
    scores,
    myScores,
    assignedJudgesCount: assignedJudgesCount ?? 0,
  });
}

export async function POST(request, { params }) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only judges can score
  if (
    authResult.user.role !== 'judge' &&
    authResult.user.role !== 'guest_judge'
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // Verify judge is assigned to the event
  if (authResult.type === 'firebase') {
    const { data: ej } = await supabaseAdmin
      .from('event_judges')
      .select('event_id')
      .eq('event_id', id)
      .eq('judge_id', authResult.user.id)
      .maybeSingle();
    if (!ej)
      return NextResponse.json(
        { error: 'Not assigned to this event' },
        { status: 403 },
      );
  } else if (authResult.type === 'guest') {
    // For guest judges, verify they belong to this event
    if (authResult.user.event_id !== parseInt(id)) {
      return NextResponse.json(
        { error: 'Not assigned to this event' },
        { status: 403 },
      );
    }
  }

  // Fetch event details for validation & turn state
  const { data: eventRow } = await supabaseAdmin
    .from('events')
    .select('max_score, judges_order, current_judge_index, status')
    .eq('id', id)
    .maybeSingle();

  if (!eventRow) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  if (eventRow.status !== 'active') {
    return NextResponse.json({ error: 'Event is not active' }, { status: 400 });
  }

  // Verify Turn
  const isUserJudge = authResult.type === 'firebase';
  const myAppId = authResult.user.id;

  const judgesOrder = eventRow.judges_order || [];
  const currentJudgeIndex = eventRow.current_judge_index;

  if (currentJudgeIndex !== null && judgesOrder.length > 0) {
    const currentJudge = judgesOrder[currentJudgeIndex];
    if (!currentJudge || currentJudge.id !== myAppId) {
      return NextResponse.json(
        { error: 'It is not your turn to score yet!' },
        { status: 403 },
      );
    }
  }

  const maxScore = eventRow.max_score ?? 10;

  const { participant_id, score } = await request.json();
  if (!participant_id)
    return NextResponse.json(
      { error: 'participant_id is required' },
      { status: 400 },
    );
  const numScore = Number(score);
  if (isNaN(numScore) || numScore < 1 || numScore > maxScore) {
    return NextResponse.json(
      { error: `Score must be between 1 and ${maxScore}` },
      { status: 400 },
    );
  }

  // Check if this judge already scored this participant in this event
  let existingQuery = supabaseAdmin
    .from('scores')
    .select('id')
    .eq('event_id', id)
    .eq('participant_id', participant_id);

  if (authResult.type === 'firebase') {
    existingQuery = existingQuery.eq('judge_id', authResult.user.id);
  } else if (authResult.type === 'guest') {
    existingQuery = existingQuery.eq('guest_judge_id', authResult.user.id);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  let result, opError;
  if (existing) {
    // Update existing score
    ({ data: result, error: opError } = await supabaseAdmin
      .from('scores')
      .update({ score: numScore })
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    // Insert new score
    const scoreData = {
      event_id: id,
      participant_id,
      score: numScore,
    };

    if (authResult.type === 'firebase') {
      scoreData.judge_id = authResult.user.id;
    } else if (authResult.type === 'guest') {
      scoreData.guest_judge_id = authResult.user.id;
    }

    ({ data: result, error: opError } = await supabaseAdmin
      .from('scores')
      .insert(scoreData)
      .select()
      .single());
  }

  if (opError) {
    return NextResponse.json({ error: opError.message }, { status: 500 });
  }

  // Auto-advance the turn state
  if (currentJudgeIndex !== null && judgesOrder.length > 0) {
    const nextIndex = currentJudgeIndex + 1;
    const now = new Date().toISOString();

    let updatePayload = {};
    if (nextIndex >= judgesOrder.length) {
      // Loop finished for this participant
      updatePayload = { current_judge_index: null, turn_start_time: null };
    } else {
      // Advance to next judge
      updatePayload = { current_judge_index: nextIndex, turn_start_time: now };
    }

    await supabaseAdmin.from('events').update(updatePayload).eq('id', id);
  }

  return NextResponse.json({ score: result }, { status: 200 });
}
