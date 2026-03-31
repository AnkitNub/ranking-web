import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

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
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const event = await resolveEvent(id);
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (user.role === 'admin' && event.admin_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (user.role === 'judge') {
    const { data: ej } = await supabaseAdmin
      .from('event_judges')
      .select('event_id')
      .eq('event_id', id)
      .eq('judge_id', user.id)
      .maybeSingle();
    if (!ej) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ event });
}

export async function PUT(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const event = await resolveEvent(id);
  if (!event || event.admin_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const {
    name,
    event_date,
    start_time,
    end_time,
    deadline,
    description,
    max_score,
  } = await request.json();

  if (name !== undefined && !name?.trim())
    return NextResponse.json(
      { error: 'Name cannot be empty' },
      { status: 400 },
    );

  if (event_date !== undefined && !event_date)
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });

  if (start_time !== undefined && !start_time)
    return NextResponse.json(
      { error: 'Start time is required' },
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

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (event_date !== undefined) updateData.event_date = event_date || null;
  if (start_time !== undefined) updateData.start_time = start_time || null;
  if (end_time !== undefined) updateData.end_time = end_time || null;
  if (deadline !== undefined) updateData.deadline = deadline || null;
  if (description !== undefined)
    updateData.description = description?.trim() || null;
  if (max_score !== undefined)
    updateData.max_score = max_score ? Number(max_score) : null;

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
  if (user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const event = await resolveEvent(id);
  if (!event || event.admin_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
