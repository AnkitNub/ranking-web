import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

export async function GET(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // All scores for this event (used by both scoreboard and judge scoring page)
  const { data: scores, error } = await supabaseAdmin
    .from('scores')
    .select('id, participant_id, judge_id, score')
    .eq('event_id', id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Count of assigned judges
  const { count: assignedJudgesCount } = await supabaseAdmin
    .from('event_judges')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id);

  // For judges: also surface their own scores separately for easy lookup
  const myScores =
    user.role === 'judge' ? scores.filter((s) => s.judge_id === user.id) : [];

  return NextResponse.json({
    scores,
    myScores,
    assignedJudgesCount: assignedJudgesCount ?? 0,
  });
}

export async function POST(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'judge')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Verify this judge is assigned to the event
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
  const { data: existing } = await supabaseAdmin
    .from('scores')
    .select('id')
    .eq('event_id', id)
    .eq('participant_id', participant_id)
    .eq('judge_id', user.id)
    .maybeSingle();

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
    ({ data: result, error: opError } = await supabaseAdmin
      .from('scores')
      .insert({
        event_id: id,
        participant_id,
        judge_id: user.id,
        score: numScore,
      })
      .select()
      .single());
  }

  if (opError)
    return NextResponse.json({ error: opError.message }, { status: 500 });
  return NextResponse.json({ score: result }, { status: 200 });
}
