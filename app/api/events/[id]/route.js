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
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = authResult.user;
  const { id } = await params;
  const event = await resolveEvent(id);
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (user.role === 'admin' && event.admin_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (authResult.type === 'firebase' && user.role === 'judge') {
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
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (authResult.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const event = await resolveEvent(id);
  if (!event || event.admin_id !== authResult.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, description, max_score, number_of_judges } =
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

  if (number_of_judges !== undefined && number_of_judges !== null) {
    const numJudges = Number(number_of_judges);
    if (isNaN(numJudges) || numJudges < 1 || !Number.isInteger(numJudges))
      return NextResponse.json(
        { error: 'Number of judges must be a positive integer' },
        { status: 400 },
      );
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined)
    updateData.description = description?.trim() || null;
  if (max_score !== undefined)
    updateData.max_score = max_score ? Number(max_score) : null;
  if (number_of_judges !== undefined)
    updateData.number_of_judges = number_of_judges
      ? Number(number_of_judges)
      : null;

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
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (authResult.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const event = await resolveEvent(id);
  if (!event || event.admin_id !== authResult.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
