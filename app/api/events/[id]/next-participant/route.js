import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/apiAuth';
import { leaveInterlude } from '@/lib/turnEngine';

// POST /api/events/[id]/next-participant
// Admin-only. Leaves the per-participant interlude phase and starts the next
// participant's first judge turn, or ends the event if there are no more
// participants.
export async function POST(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const result = await leaveInterlude({
    eventId: id,
    requesterUserId: user.id,
  });

  if (result.error) {
    const status =
      result.error === 'forbidden'
        ? 403
        : result.error === 'not_found'
          ? 404
          : 400;
    const messages = {
      bad_status: 'notInInterlude',
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
