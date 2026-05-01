import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/apiAuth';

// Judges in judges_order are stored as "user:<id>" or "guest:<id>" so a
// regular judge with users.id=5 doesn't collide with a guest judge whose
// guest_judges.id is also 5.
const tagOf = (kind, id) => `${kind}:${id}`;
function parseTag(tag) {
  if (!tag) return { kind: null, id: null };
  const colon = tag.indexOf(':');
  if (colon === -1) return { kind: 'user', id: Number(tag) }; // legacy fallback
  return { kind: tag.slice(0, colon), id: Number(tag.slice(colon + 1)) };
}

// ---- helpers ----------------------------------------------------------------

async function loadEvent(eventId) {
  const { data } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();
  return data;
}

export function buildState(event) {
  if (!event) return null;
  const judgeTag = event.judges_order?.[event.current_judge_index] ?? null;
  const { kind: judgeKind, id: judgeId } = parseTag(judgeTag);
  return {
    event_id: event.id,
    status: event.status,
    current_participant_id:
      event.participants_order?.[event.current_participant_index] ?? null,
    current_judge_tag: judgeTag,
    current_judge_id: judgeId,
    current_judge_kind: judgeKind,
    current_participant_index: event.current_participant_index,
    current_judge_index: event.current_judge_index,
    participants_total: event.participants_order?.length ?? 0,
    judges_total: event.judges_order?.length ?? 0,
    turn_duration_seconds: event.turn_duration_seconds,
    turn_start_time: event.turn_start_time,
    turn_expires_at_ms: null, // Timer removed
    turn_token: event.turn_token,
    server_now_ms: Date.now(),
  };
}

function computeIsMyTurn(state, requester) {
  if (!state || state.status !== 'active')
    return false;
  
  const jId = requester.judgeId;
  const gjId = requester.guestJudgeId;
  
  // In concurrent mode, if the event is active, any assigned judge can vote.
  return jId != null || gjId != null;
}

// Conditional UPDATE: only writes if turn_token still matches the one we read
// with. Used to serialize concurrent advances (multiple polls hitting expiry
// at the same moment). Returns the new row, or null if we lost the race.
async function casUpdate(eventId, expectedToken, patch) {
  const { data } = await supabaseAdmin
    .from('events')
    .update(patch)
    .eq('id', eventId)
    .eq('turn_token', expectedToken)
    .select()
    .maybeSingle();
  return data ?? null;
}

// ---- public API -------------------------------------------------------------

export async function getEvent(eventId) {
  return loadEvent(eventId);
}

export async function startEvent({ eventId, requesterUserId }) {
  const event = await loadEvent(eventId);
  if (!event) return { error: 'not_found' };
  if (event.status !== 'not_started') return { error: 'bad_status' };
  if (event.admin_id !== requesterUserId) return { error: 'forbidden' };

  const { data: regularJudges } = await supabaseAdmin
    .from('event_judges')
    .select('judge_id')
    .eq('event_id', eventId)
    .order('judge_id');
  const { data: guestJudges } = await supabaseAdmin
    .from('guest_judges')
    .select('id')
    .eq('event_id', eventId)
    .order('id');
  const { data: parts } = await supabaseAdmin
    .from('participants')
    .select('id')
    .eq('event_id', eventId)
    .order('id');

  const judges_order = [
    ...(regularJudges ?? [])
      .filter((j) => j.judge_id != null)
      .map((j) => tagOf('user', j.judge_id)),
    ...(guestJudges ?? [])
      .filter((g) => g.id != null)
      .map((g) => tagOf('guest', g.id)),
  ];

  const participants_order = (parts ?? [])
    .filter((p) => p.id != null)
    .map((p) => p.id);

  if (judges_order.length === 0) return { error: 'no_judges' };
  if (participants_order.length === 0) return { error: 'no_participants' };

  const updated = await casUpdate(eventId, event.turn_token, {
    status: 'active',
    started_at: new Date().toISOString(),
    judges_order,
    participants_order,
    current_participant_index: 0,
    current_judge_index: 0,
    current_participant_id: participants_order[0],
    turn_start_time: new Date().toISOString(),
    turn_token: randomUUID(),
  });
  if (!updated) return { error: 'race_lost' };
  return { state: buildState(updated) };
}

// Moves to interlude (manual now, called by Host).
export async function enterInterlude({ eventId, requesterUserId }) {
  const event = await loadEvent(eventId);
  if (!event) return { error: 'not_found' };
  if (event.admin_id !== requesterUserId) return { error: 'forbidden' };
  if (event.status !== 'active') return { error: 'bad_status' };

  const updated = await casUpdate(event.id, event.turn_token, {
    status: 'interlude',
    turn_start_time: null,
    turn_token: randomUUID(),
  });
  if (!updated) return { error: 'race_lost' };
  return { state: buildState(updated) };
}

// Leaves interlude → starts the next participant's concurrent voting turn, or ends
// the event if every participant has been scored. Admin-only.
export async function leaveInterlude({ eventId, requesterUserId }) {
  const event = await loadEvent(eventId);
  if (!event) return { error: 'not_found' };
  if (event.admin_id !== requesterUserId) return { error: 'forbidden' };
  if (event.status !== 'interlude') return { error: 'bad_status' };

  const nextPIdx = event.current_participant_index + 1;

  if (nextPIdx >= event.participants_order.length) {
    const ended = await casUpdate(event.id, event.turn_token, {
      status: 'ended',
      turn_start_time: null,
      turn_token: randomUUID(),
    });
    if (!ended) return { error: 'race_lost' };
    return { state: buildState(ended) };
  }

  const advanced = await casUpdate(event.id, event.turn_token, {
    status: 'active',
    current_participant_index: nextPIdx,
    current_judge_index: 0,
    current_participant_id: event.participants_order[nextPIdx],
    turn_start_time: new Date().toISOString(),
    turn_token: randomUUID(),
  });
  if (!advanced) return { error: 'race_lost' };
  return { state: buildState(advanced) };
}

export async function getStateWithLazyAdvance(eventId, requester = null) {
  const event = await loadEvent(eventId);
  if (!event) return null;

  // Lazy advance removed because there's no timer-based sequential turn anymore.
  const state = buildState(event);
  if (state && requester) state.is_my_turn = computeIsMyTurn(state, requester);
  return state;
}

export async function recordScore({
  eventId,
  judgeId,
  guestJudgeId,
  participantId,
  score,
  turnToken,
}) {
  const evId = Number(eventId);
  const partId = Number(participantId);
  const jId = judgeId != null ? Number(judgeId) : null;
  const gjId = guestJudgeId != null ? Number(guestJudgeId) : null;

  const event = await loadEvent(evId);
  if (!event) return { error: 'not_found' };
  if (event.status !== 'active') return { error: 'bad_status' };
  if (event.turn_token !== turnToken) return { error: 'stale_turn' };
  if (event.current_participant_id !== partId)
    return { error: 'wrong_participant' };

  // In concurrent mode, any assigned judge can score at any time while status is 'active'.
  const numScore = Number(score);
  if (
    !Number.isFinite(numScore) ||
    numScore < 1 ||
    numScore > (event.max_score ?? 10)
  )
    return { error: 'bad_score' };

  const onConflict = jId != null
    ? 'event_id,participant_id,judge_id'
    : 'event_id,participant_id,guest_judge_id';

  const { error: upsertErr } = await supabaseAdmin.from('scores').upsert(
    {
      event_id: evId,
      participant_id: partId,
      judge_id: jId,
      guest_judge_id: gjId,
      score: numScore,
    },
    { onConflict },
  );
  if (upsertErr) {
    return { error: 'db_error' };
  }

  // We DO NOT advance here in concurrent mode. The Host advances manually.
  return { state: buildState(event) };
}

