import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  getGuestUser,
  supabaseAdmin,
} from '@/lib/apiAuth';

export async function GET(request, { params }) {
  const user = await getAuthenticatedUser(request);
  const guest = getGuestUser(request);
  if (!user && !guest)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (guest && String(guest.event_id) !== String(id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('participants')
    .select('*')
    .eq('event_id', id)
    .order('created_at', { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ participants: data });
}

export async function POST(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify the requester owns this event and it hasn't started.
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('admin_id, status')
    .eq('id', id)
    .single();
  if (!event || event.admin_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { count: currentCount } = await supabaseAdmin
    .from('participants')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id);

  if ((currentCount ?? 0) >= 15) {
    return NextResponse.json(
      { error: 'participantLimitReached', message: 'Maximum 15 participants allowed' },
      { status: 400 },
    );
  }

  if (event.status !== 'not_started') {
    return NextResponse.json(
      { error: 'Cannot add participants after event has started' },
      { status: 400 },
    );
  }

  const { name } = await request.json();
  if (!name?.trim())
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('participants')
    .insert({ name: name.trim(), event_id: id })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ participant: data }, { status: 201 });
}
