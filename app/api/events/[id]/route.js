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
