import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';
import { leaveInterlude, enterInterlude } from '@/lib/turnEngine';

// POST /api/events/[id]/next-participant
// Admin-only. 
// If status is 'active', moves to 'interlude'.
// If status is 'interlude', moves to the next participant or ends the event.
export async function POST(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Check current status
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('status')
    .eq('id', id)
    .single();

  if (!event)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let result;
  if (event.status === 'active') {
    result = await enterInterlude({
      eventId: id,
      requesterUserId: user.id,
    });
  } else if (event.status === 'interlude') {
    result = await leaveInterlude({
      eventId: id,
      requesterUserId: user.id,
    });
  } else {
    return NextResponse.json({ error: 'bad_status', message: 'notScoring' }, { status: 400 });
  }

  if (result.error) {
    const status =
      result.error === 'forbidden'
        ? 403
        : result.error === 'not_found'
          ? 404
          : 400;
    const messages = {
      bad_status: 'wrongStatus',
      forbidden: 'forbidden',
      not_found: 'notFound',
      race_lost: 'pleaseTryAgain',
    };
    return NextResponse.json(
      { error: result.error, message: messages[result.error] ?? result.error },
      { status },
    );
  }
  return NextResponse.json({ state: result.state });
}
