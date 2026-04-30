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
  const turnStart = event.turn_start_time
    ? new Date(event.turn_start_time.includes('Z') || event.turn_start_time.includes('+') 
        ? event.turn_start_time 
        : event.turn_start_time.replace(' ', 'T') + 'Z').getTime()
    : null;
  const expiresAtMs = turnStart
    ? turnStart + (event.turn_duration_seconds ?? 60) * 1000
    : null;
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
    turn_duration_seconds: event.turn_duration_seconds,
    turn_start_time: event.turn_start_time,
    turn_expires_at_ms: expiresAtMs,
    turn_token: event.turn_token,
    server_now_ms: Date.now(),
  };
}

function computeIsMyTurn(state, requester) {
  if (!state || state.status !== 'active' || !state.current_judge_tag)
    return false;
  const jId = requester.judgeId;
  const gjId = requester.guestJudgeId;
  
  let requesterTag = null;
  if (jId != null) requesterTag = tagOf('user', jId);
  else if (gjId != null) requesterTag = tagOf('guest', gjId);

  if (!requesterTag) return false;
  
  const matches = state.current_judge_tag === requesterTag;
  console.log(`[TurnEngine] computeIsMyTurn: current=${state.current_judge_tag}, requester=${requesterTag}, matches=${matches}`);
  return matches;
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

// Advance one turn. Race-safe via turn_token CAS. Returns the new state, or
// null if we lost the race (caller can re-read).
async function advanceOnce({ event }) {
  let pIdx = event.current_participant_index;
  let jIdx = event.current_judge_index + 1;

  if (jIdx >= event.judges_order.length) {
    jIdx = 0;
    pIdx += 1;
  }

  if (pIdx >= event.participants_order.length) {
    return casUpdate(event.id, event.turn_token, {
      status: 'ended',
      turn_start_time: null,
      turn_token: randomUUID(),
    });
  }

  return casUpdate(event.id, event.turn_token, {
    current_participant_index: pIdx,
    current_judge_index: jIdx,
    current_participant_id: event.participants_order[pIdx],
    turn_start_time: new Date().toISOString(),
    turn_token: randomUUID(),
  });
}

// Lazy expiry: if the current turn has timed out, advance. Loop in case
// many turns expired while nobody was looking (e.g., browser was closed).
// Bounded to keep accidents from runaway-looping.
const MAX_LAZY_ADVANCES = 50;

export async function getStateWithLazyAdvance(eventId, requester = null) {
  let event = await loadEvent(eventId);
  if (!event) return null;

  for (let i = 0; i < MAX_LAZY_ADVANCES; i++) {
    if (event.status !== 'active') break;
    const turnStart = event.turn_start_time
      ? new Date(event.turn_start_time.includes('Z') || event.turn_start_time.includes('+') 
          ? event.turn_start_time 
          : event.turn_start_time.replace(' ', 'T') + 'Z').getTime()
      : null;
    const expiresAtMs = turnStart
      ? turnStart + (event.turn_duration_seconds ?? 60) * 1000
      : null;
    if (!expiresAtMs || Date.now() < expiresAtMs) break;

    const next = await advanceOnce({ event });
    if (!next) {
      // Lost the race to another caller; just re-read and stop advancing.
      event = await loadEvent(eventId);
      break;
    }
    event = next;
  }
  const state = buildState(event);
  if (state && requester) state.is_my_turn = computeIsMyTurn(state, requester);
  return state;
}

export async function recordScoreAndAdvance({
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

  const expectedJudgeTag = event.judges_order[event.current_judge_index];
  const submitterTag =
    jId != null ? tagOf('user', jId) : tagOf('guest', gjId);
  
  console.log(`[TurnEngine] recordScore: expected=${expectedJudgeTag}, submitter=${submitterTag}`);
  
  if (submitterTag !== expectedJudgeTag) return { error: 'not_your_turn' };

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

  const advanced = await advanceOnce({ event });
  // If CAS failed, the lazy-advance path on the next poll will catch up.
  return { state: buildState(advanced ?? (await loadEvent(eventId))) };
}
