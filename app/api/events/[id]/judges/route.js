import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

export async function GET(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('event_judges')
    .select('judge_id, users(id, name, email)')
    .eq('event_id', id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const judges = data.map((row) => row.users).filter(Boolean);
  return NextResponse.json({ judges });
}

export async function POST(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Verify admin owns the event
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('admin_id')
    .eq('id', id)
    .single();
  if (!event || event.admin_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { judge_id } = await request.json();
  if (!judge_id)
    return NextResponse.json(
      { error: 'judge_id is required' },
      { status: 400 },
    );

  // Check if already assigned
  const { data: existing } = await supabaseAdmin
    .from('event_judges')
    .select('event_id')
    .eq('event_id', id)
    .eq('judge_id', judge_id)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabaseAdmin
      .from('event_judges')
      .insert({ event_id: id, judge_id });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('admin_id')
    .eq('id', id)
    .single();
  if (!event || event.admin_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { judge_id } = await request.json();
  const { error } = await supabaseAdmin
    .from('event_judges')
    .delete()
    .eq('event_id', id)
    .eq('judge_id', judge_id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
