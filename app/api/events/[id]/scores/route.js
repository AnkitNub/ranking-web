import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  getGuestUser,
  supabaseAdmin,
} from '@/lib/apiAuth';

export async function GET(request, { params }) {
  const user = await getAuthenticatedUser(request);
  const guest = getGuestUser(request);
  if (!user && !guest)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (guest && String(guest.event_id) !== String(id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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

  const { count: guestJudgesCount } = await supabaseAdmin
    .from('guest_judges')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id);

  // For guest judges: surface their own scores separately
  let myScores = [];
  if (guest) {
    myScores = scores.filter((s) => s.guest_judge_id === guest.id);
  } else if (user && user.role === 'judge') {
    // For judges: surface their own scores separately for easy lookup
    myScores = scores.filter((s) => s.judge_id === user.id);
  }

  return NextResponse.json({
    scores,
    myScores,
    assignedJudgesCount: (assignedJudgesCount ?? 0) + (guestJudgesCount ?? 0),
  });
}

export async function POST(request, { params }) {
  const user = await getAuthenticatedUser(request);
  const guest = getGuestUser(request);
  if (!user && !guest)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user && user.role !== 'judge')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if (guest && String(guest.event_id) !== String(id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify this judge is assigned to the event
  if (user) {
    const { data: ej } = await supabaseAdmin
      .from('event_judges')
      .select('event_id')
      .eq('event_id', id)
      .eq('judge_id', user.id)
      .maybeSingle();
    if (!ej)
      return NextResponse.json(
        { error: 'Not assigned to this event' },
        { status: 403 },
      );
  }

  // Fetch event's max_score for validation
  const { data: eventRow } = await supabaseAdmin
    .from('events')
    .select('max_score')
    .eq('id', id)
    .maybeSingle();
  const maxScore = eventRow?.max_score ?? 10;

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

  if (guest) {
    existingQuery = existingQuery.eq('guest_judge_id', guest.id);
  } else {
    existingQuery = existingQuery.eq('judge_id', user.id);
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
    const insertData = {
      event_id: id,
      participant_id,
      score: numScore,
    };
    if (guest) {
      insertData.guest_judge_id = guest.id;
    } else {
      insertData.judge_id = user.id;
    }

    ({ data: result, error: opError } = await supabaseAdmin
      .from('scores')
      .insert(insertData)
      .select()
      .single());
  }

  if (opError)
    return NextResponse.json({ error: opError.message }, { status: 500 });
  return NextResponse.json({ score: result }, { status: 200 });
}
