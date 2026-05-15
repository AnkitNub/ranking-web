import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/apiAuth';

/**
 * Public (no-auth) endpoint – returns the aggregated scoreboard and live
 * status for the presentation view at /present/[id]. Includes:
 *   - event status (active | interlude | ended | not_started)
 *   - current_participant_id (the participant on stage, or the just-finished
 *     one during interlude)
 *   - per-participant scores (with judge names, including guest judges)
 *   - assignedJudgesCount = regular + guest judges
 */
export async function GET(_request, { params }) {
  const { id } = await params;

  const [eventRes, participantsRes, scoresRes, judgesRes, guestJudgesRes] =
    await Promise.all([
      supabaseAdmin
        .from('events')
        .select(
          'id, name, admin_id, event_date, status, current_participant_id, current_participant_index, current_judge_index, judges_order, participants_order, score_decimal_places',
        )
        .eq('id', id)
        .single(),
      supabaseAdmin
        .from('participants')
        .select('id, name')
        .eq('event_id', id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('scores')
        .select(
          `
          participant_id,
          score,
          judge_id,
          guest_judge_id,
          judge:users(name)
        `,
        )
        .eq('event_id', id),
      supabaseAdmin
        .from('event_judges')
        .select('judge_id', { count: 'exact' })
        .eq('event_id', id),
      supabaseAdmin
        .from('guest_judges')
        .select('id, name')
        .eq('event_id', id),
    ]);

  if (eventRes.error || !eventRes.data)
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const event = eventRes.data;
  const participants = participantsRes.data ?? [];
  const scores = scoresRes.data ?? [];
  const guestJudges = guestJudgesRes.data ?? [];
  const guestNameById = new Map(guestJudges.map((g) => [g.id, g.name]));
  const regularJudgesCount = judgesRes.count ?? 0;
  const assignedJudgesCount = regularJudgesCount + guestJudges.length;

  const precision = event.score_decimal_places ?? 0;
  const multiplier = Math.pow(10, precision);

  const ranked = participants
    .map((p, index) => {
      const participantScores = scores.filter((s) => s.participant_id === p.id);
      const rawTotal = participantScores.reduce((sum, s) => sum + s.score, 0);
      const totalScore = Math.round(rawTotal * multiplier) / multiplier;
      const judgesScored = participantScores.length;

      const detailedScores = participantScores.map((s) => ({
        score: s.score,
        judgeName:
          s.judge?.name ||
          (s.guest_judge_id != null
            ? guestNameById.get(s.guest_judge_id) || 'Guest'
            : 'Judge'),
      }));

      return {
        id: p.id,
        name: p.name,
        originalIndex: index,
        totalScore,
        judgesScored,
        scores: detailedScores,
        fullyScored:
          assignedJudgesCount > 0 && judgesScored === assignedJudgesCount,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  return NextResponse.json({
    event: {
      id: event.id,
      name: event.name,
      admin_id: event.admin_id,
      event_date: event.event_date,
      status: event.status,
      current_participant_id: event.current_participant_id,
      current_participant_index: event.current_participant_index,
      current_judge_index: event.current_judge_index,
      judges_total: event.judges_order?.length ?? 0,
      score_decimal_places: event.score_decimal_places ?? 0,
      participants_order: event.participants_order ?? [],
    },
    ranked,
    assignedJudgesCount,
    allScored:
      assignedJudgesCount > 0 &&
      ranked.length > 0 &&
      ranked.every((p) => p.judgesScored === assignedJudgesCount),
  });
}
