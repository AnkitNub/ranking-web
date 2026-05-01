import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/apiAuth';

function generateRandomString(length) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase();
}

// GET /api/events
// Returns events the requester hosts. The judge page fetches events they're
// assigned to via /api/events directly too, so we include those when present.
export async function GET(request) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [hostedRes, judgingRes] = await Promise.all([
    supabaseAdmin
      .from('events')
      .select('*')
      .eq('admin_id', user.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('event_judges')
      .select('event_id, events(*)')
      .eq('judge_id', user.id),
  ]);

  if (hostedRes.error)
    return NextResponse.json({ error: hostedRes.error.message }, { status: 500 });
  if (judgingRes.error)
    return NextResponse.json({ error: judgingRes.error.message }, { status: 500 });

  const hosted = hostedRes.data ?? [];
  const judging = (judgingRes.data ?? []).map((d) => d.events).filter(Boolean);

  // Caller chooses which list to display; expose both.
  return NextResponse.json({ events: hosted, hosted, judging });
}

// Daily cap on event creation per user. Prevents abuse now that any signed-in
// user (not just admins) can create events. Tune the constant if needed.
const DAILY_EVENT_CREATE_LIMIT = 5;

export async function POST(request) {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Per-user daily rate limit.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabaseAdmin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('admin_id', user.id)
    .gte('created_at', since);
  if ((recentCount ?? 0) >= DAILY_EVENT_CREATE_LIMIT) {
    return NextResponse.json(
      {
        error: 'rate_limit',
        message: 'eventCreateRateLimit',
        limit: DAILY_EVENT_CREATE_LIMIT,
      },
      { status: 429 },
    );
  }

  const { name, description, max_score, event_date, start_time } =
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

  const event_code = generateRandomString(6);
  const judge_password = generateRandomString(6);

  // Calculate expiration: 24 hours after start_time if provided, else 24 hours from now
  let expires_at;
  if (event_date && start_time) {
    // Force Japanese Standard Time (JST) parsing by appending +09:00
    const startDateTime = new Date(`${event_date}T${start_time}+09:00`);
    expires_at = new Date(
      startDateTime.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
  } else {
    expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      max_score: max_score ? maxScoreNum : 10,
      event_date: event_date || null,
      start_time: start_time || null,
      admin_id: user.id,
      event_code,
      judge_password,
      turn_duration_seconds: 10,
      expires_at,
    })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data }, { status: 201 });
}
