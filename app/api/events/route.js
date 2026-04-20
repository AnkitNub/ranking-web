import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';
import { generatePassword } from '@/lib/passwordGenerator';

export async function GET(request) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = authResult.user;

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
  const authResult = await getAuthenticatedUser(request);
  if (!authResult)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = authResult.user;
  if (user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, description, max_score, number_of_judges } =
    await request.json();
  if (!name?.trim())
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });

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

  const numJudges = Number(number_of_judges);

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      max_score: max_score ? maxScoreNum : 10,
      number_of_judges: Math.max(1, numJudges || 5),
      admin_id: user.id,
      judge_password: generatePassword(),
      status: 'not_started',
    })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data }, { status: 201 });
}
