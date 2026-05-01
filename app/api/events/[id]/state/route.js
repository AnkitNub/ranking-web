import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  getGuestUser,
  supabaseAdmin,
} from '@/lib/apiAuth';
import { getStateWithLazyAdvance } from '@/lib/turnEngine';

// GET /api/events/[id]/state
// Source of truth for the live UI. Every poll lazily advances the turn if
// the deadline has passed, so no background timer process is required.
export async function GET(request, { params }) {
  const user = await getAuthenticatedUser(request);
  const guest = getGuestUser(request);
  if (!user && !guest)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (guest && String(guest.event_id) !== String(id))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let isHost = false;
  let isAssignedJudge = false;
  if (user) {
    const { data: ev } = await supabaseAdmin
      .from('events')
      .select('admin_id')
      .eq('id', id)
      .maybeSingle();
    if (!ev) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    isHost = ev.admin_id === user.id;
    if (!isHost) {
      const { data: ej } = await supabaseAdmin
        .from('event_judges')
        .select('event_id')
        .eq('event_id', id)
        .eq('judge_id', user.id)
        .maybeSingle();
      isAssignedJudge = !!ej;
    }
    if (!isHost && !isAssignedJudge)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only treat the requester as a judge for is_my_turn purposes when they are
  // actually assigned to score (not when they're just hosting).
  const requester = user
    ? { judgeId: isAssignedJudge ? user.id : null }
    : { guestJudgeId: guest.id };
  const state = await getStateWithLazyAdvance(id, requester);
  if (!state)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(
    { state },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
