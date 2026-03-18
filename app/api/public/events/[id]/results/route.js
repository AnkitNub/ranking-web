import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/apiAuth';

/**
 * Public (no-auth) endpoint – returns aggregated scoreboard for the
 * presentation view at /present/[id].
 */
export async function GET(_request, { params }) {
  const { id } = await params;

  const [eventRes, participantsRes, scoresRes, judgesCountRes] =
    await Promise.all([
      supabaseAdmin
        .from('events')
        .select('id, name, event_date')
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
          judge:users(name)
        `,
        )
        .eq('event_id', id),
      supabaseAdmin
        .from('event_judges')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id),
    ]);

  if (eventRes.error || !eventRes.data)
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const participants = participantsRes.data ?? [];
  const scores = scoresRes.data ?? [];
  const assignedJudgesCount = judgesCountRes.count ?? 0;

  const ranked = participants
    .map((p) => {
      const participantScores = scores.filter((s) => s.participant_id === p.id);
      const totalScore = participantScores.reduce((sum, s) => sum + s.score, 0);
      const judgesScored = participantScores.length;

      const detailedScores = participantScores.map((s) => ({
        score: s.score,
        judgeName: s.judge?.name || 'Judge',
      }));

      return {
        id: p.id,
        name: p.name,
        totalScore,
        judgesScored,
        scores: detailedScores,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  return NextResponse.json({
    event: eventRes.data,
    ranked,
    assignedJudgesCount,
    allScored:
      assignedJudgesCount > 0 &&
      ranked.every((p) => p.judgesScored === assignedJudgesCount),
  });
}
