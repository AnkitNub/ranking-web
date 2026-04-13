import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin, JWT_SECRET } from '@/lib/apiAuth';

export async function POST(request) {
  try {
    const { event_id, judge_name, event_password } = await request.json();

    if (!event_id || !judge_name || !event_password) {
      return NextResponse.json(
        { error: 'event_id, judge_name, and event_password are required' },
        { status: 400 },
      );
    }

    // Verify event exists and check password
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, judge_password')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'イベントが見つかりません。' },
        { status: 404 },
      );
    }

    // Verify password
    if (event.judge_password !== event_password) {
      return NextResponse.json(
        { error: 'イベントパスワードが正しくありません。' },
        { status: 401 },
      );
    }

    // Create guest judge entry
    const { data: guestJudge, error: insertError } = await supabaseAdmin
      .from('guest_judges')
      .insert({
        event_id,
        name: judge_name,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create guest judge:', insertError);
      return NextResponse.json(
        { error: 'ゲストジャッジの作成に失敗しました。' },
        { status: 500 },
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        guest_judge_id: guestJudge.id,
        event_id: guestJudge.event_id,
        judge_name: guestJudge.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    return NextResponse.json(
      {
        token,
        guest_judge_id: guestJudge.id,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Guest judge login error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 },
    );
  }
}
