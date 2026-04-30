import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  getGuestUser,
  supabaseAdmin,
} from '@/lib/apiAuth';
import { recordScoreAndAdvance } from '@/lib/turnEngine';

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
  if (guest && String(guest.event_id) !== String(id))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

  const { participant_id, score, turn_token } = await request.json();
  if (!participant_id)
    return NextResponse.json(
      { error: 'participant_id is required' },
      { status: 400 },
    );
  if (!turn_token)
    return NextResponse.json(
      { error: 'turn_token is required' },
      { status: 400 },
    );

  const result = await recordScoreAndAdvance({
    eventId: id,
    judgeId: user?.id ?? null,
    guestJudgeId: guest?.id ?? null,
    participantId: participant_id,
    score,
    turnToken: turn_token,
  });

  if (result.error) {
    const status =
      result.error === 'not_your_turn' || result.error === 'stale_turn'
        ? 409
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ state: result.state });
}
