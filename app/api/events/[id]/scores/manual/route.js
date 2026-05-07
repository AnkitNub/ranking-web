import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

export async function POST(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify user is the host of this event and fetch event settings
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('admin_id, max_score, score_decimal_places')
    .eq('id', id)
    .maybeSingle();

  if (eventError || !event)
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (event.admin_id !== user.id)
    return NextResponse.json(
      { error: 'Only host can edit scores' },
      { status: 403 },
    );

  const { participant_id, judge_id, guest_judge_id, score } =
    await request.json();

  if (!participant_id || score === undefined)
    return NextResponse.json(
      { error: 'participant_id and score are required' },
      { status: 400 },
    );

  if (!judge_id && !guest_judge_id)
    return NextResponse.json(
      { error: 'judge_id or guest_judge_id is required' },
      { status: 400 },
    );

  // Validate score range and decimal places
  const maxScore = event.max_score || 10;
  const decimalPlaces = event.score_decimal_places ?? 0;

  if (score !== null && score !== undefined) {
    if (typeof score !== 'number' || isNaN(score)) {
      return NextResponse.json(
        { error: 'score must be a valid number' },
        { status: 400 },
      );
    }

    if (score < 0 || score > maxScore) {
      return NextResponse.json(
        { error: `score must be between 0 and ${maxScore}` },
        { status: 400 },
      );
    }

    // Validate decimal precision using string representation
    const scoreStr = String(score);
    const decimalIndex = scoreStr.indexOf('.');
    if (decimalIndex !== -1) {
      const decimals = scoreStr.length - decimalIndex - 1;
      if (decimals > decimalPlaces) {
        return NextResponse.json(
          { error: `score must have at most ${decimalPlaces} decimal places` },
          { status: 400 },
        );
      }
    }
  }

  // Find or create the score record
  let query = supabaseAdmin
    .from('scores')
    .select('id')
    .eq('event_id', id)
    .eq('participant_id', participant_id);

  if (judge_id) {
    query = query.eq('judge_id', judge_id);
  } else {
    query = query.eq('guest_judge_id', guest_judge_id).is('judge_id', null);
  }

  const { data: existing } = await query.maybeSingle();

  let result;
  if (existing) {
    // Update existing score
    const { data, error } = await supabaseAdmin
      .from('scores')
      .update({ score })
      .eq('id', existing.id)
      .select('id, participant_id, judge_id, guest_judge_id, score');

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    result = data?.[0];
  } else {
    // Insert new score
    const { data, error } = await supabaseAdmin
      .from('scores')
      .insert({
        event_id: id,
        participant_id,
        judge_id: judge_id || null,
        guest_judge_id: guest_judge_id || null,
        score,
      })
      .select('id, participant_id, judge_id, guest_judge_id, score');

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    result = data?.[0];
  }

  return NextResponse.json({ score: result });
}

export async function DELETE(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { scoreId } = await request.json();

  if (!scoreId)
    return NextResponse.json({ error: 'scoreId is required' }, { status: 400 });

  // Verify user is the host of this event
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('admin_id')
    .eq('id', id)
    .maybeSingle();

  if (eventError || !event)
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (event.admin_id !== user.id)
    return NextResponse.json(
      { error: 'Only host can edit scores' },
      { status: 403 },
    );

  const { error } = await supabaseAdmin
    .from('scores')
    .delete()
    .eq('id', scoreId)
    .eq('event_id', id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
