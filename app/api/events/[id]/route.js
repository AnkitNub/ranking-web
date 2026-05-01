import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  getGuestUser,
  supabaseAdmin,
} from '@/lib/apiAuth';

async function resolveEvent(id) {
  const { data } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

export async function GET(request, { params }) {
  const user = await getAuthenticatedUser(request);
  const guest = getGuestUser(request);

  if (!user && !guest)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  if (guest && String(guest.event_id) !== String(id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const event = await resolveEvent(id);
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Authorize as either the event's host, an assigned judge, or a guest judge
  // for this event.
  if (user) {
    const isHost = event.admin_id === user.id;
    let isAssignedJudge = false;
    if (!isHost) {
      const { data: ej } = await supabaseAdmin
        .from('event_judges')
        .select('event_id')
        .eq('event_id', id)
        .eq('judge_id', user.id)
        .maybeSingle();
      isAssignedJudge = !!ej;
    }
    if (!isHost && !isAssignedJudge) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({ event });
}

export async function PUT(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const event = await resolveEvent(id);
  if (!event || event.admin_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, description, max_score, event_date, start_time, turn_duration_seconds } =
    await request.json();

  if (name !== undefined && !name?.trim())
    return NextResponse.json(
      { error: 'Name cannot be empty' },
      { status: 400 },
    );

  if (max_score !== undefined && max_score !== null) {
    const maxScoreNum = Number(max_score);
    if (isNaN(maxScoreNum) || maxScoreNum < 1 || !Number.isInteger(maxScoreNum))
      return NextResponse.json(
        { error: 'Max score must be a positive integer' },
        { status: 400 },
      );
  }

  if (turn_duration_seconds !== undefined && turn_duration_seconds !== null) {
    const durationNum = Number(turn_duration_seconds);
    if (isNaN(durationNum) || durationNum < 1 || !Number.isInteger(durationNum))
      return NextResponse.json(
        { error: 'Turn duration must be a positive integer' },
        { status: 400 },
      );
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined)
    updateData.description = description?.trim() || null;
  if (max_score !== undefined)
    updateData.max_score = max_score ? Number(max_score) : null;
  if (turn_duration_seconds !== undefined)
    updateData.turn_duration_seconds = turn_duration_seconds ? Number(turn_duration_seconds) : null;

  if (event_date !== undefined) updateData.event_date = event_date || null;
  if (start_time !== undefined) updateData.start_time = start_time || null;

  // Recalculate expires_at if time was explicitly modified
  if (event_date !== undefined || start_time !== undefined) {
    const currentDate =
      event_date !== undefined ? event_date : event.event_date;
    const currentTime =
      start_time !== undefined ? start_time : event.start_time;
    if (currentDate && currentTime) {
      // Force Japanese Standard Time (JST) parsing by appending +09:00
      const startDateTime = new Date(`${currentDate}T${currentTime}+09:00`);
      updateData.expires_at = new Date(
        startDateTime.getTime() + 24 * 60 * 60 * 1000,
      ).toISOString();
    }
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function DELETE(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const event = await resolveEvent(id);
  if (!event || event.admin_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete all associated records in order to satisfy foreign key constraints.
  // 1. Scores (which depend on event_id)
  await supabaseAdmin.from('scores').delete().eq('event_id', id);

  // 2. Participants
  await supabaseAdmin.from('participants').delete().eq('event_id', id);

  // 3. Event Judges (assigned judges)
  await supabaseAdmin.from('event_judges').delete().eq('event_id', id);

  // 4. Guest Judges
  await supabaseAdmin.from('guest_judges').delete().eq('event_id', id);

  // 5. Finally, the event itself.
  const { error } = await supabaseAdmin.from('events').delete().eq('id', id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

