import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/apiAuth';
import { startEvent } from '@/lib/turnEngine';

// POST /api/events/[id]/start
// Admin-only. Snapshots judges_order + participants_order, marks the event
// active, and starts the first turn.
export async function POST(request, { params }) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const result = await startEvent({
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
      no_judges: 'noJudgesAssigned',
      no_participants: 'noParticipantsYet',
      bad_status: 'eventAlreadyStarted',
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
