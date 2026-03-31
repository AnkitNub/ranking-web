import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

export async function GET(request) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'admin') {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('admin_id', user.id)
      .order('created_at', { ascending: false });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ events: data });
  }

  if (user.role === 'judge') {
    const { data, error } = await supabaseAdmin
      .from('event_judges')
      .select('event_id, events(*)')
      .eq('judge_id', user.id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    const events = data.map((d) => d.events).filter(Boolean);
    return NextResponse.json({ events });
  }

  return NextResponse.json({ events: [] });
}

export async function POST(request) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const {
    name,
    event_date,
    start_time,
    end_time,
    description,
    deadline,
    max_score,
  } = await request.json();
  if (!name?.trim())
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!event_date)
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  if (!start_time)
    return NextResponse.json(
      { error: 'Start time is required' },
      { status: 400 },
    );

  const maxScoreNum = Number(max_score);
  if (
    max_score !== undefined &&
    max_score !== null &&
    (isNaN(maxScoreNum) || maxScoreNum < 1 || !Number.isInteger(maxScoreNum))
  )
    return NextResponse.json(
      { error: 'Max score must be a positive integer' },
      { status: 400 },
    );

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      name: name.trim(),
      event_date: event_date || null,
      start_time: start_time || null,
      end_time: end_time || null,
      description: description?.trim() || null,
      deadline: deadline || null,
      max_score: max_score ? maxScoreNum : 10,
      admin_id: user.id,
    })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data }, { status: 201 });
}
