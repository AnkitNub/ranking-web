import { cookies } from 'next/headers';
import { supabaseAdmin as supabase } from '@/lib/apiAuth';

export async function POST(req) {
  try {
    const { event_code: raw_event_code, judge_password: raw_judge_password, name } = await req.json();

    const event_code = raw_event_code?.trim()?.toUpperCase();
    const judge_password = raw_judge_password?.trim()?.toUpperCase();

    if (!event_code || !judge_password || !name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // 1. Verify event code, password, and expiration
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, expires_at')
      .eq('event_code', event_code)
      .eq('judge_password', judge_password)
      .single();

    if (eventError || !event) {
      if (eventError) {
        console.error('Event verification error:', eventError);
      }
      return new Response(
        JSON.stringify({ error: 'Invalid event code or password.' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (event.expires_at && new Date(event.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This event has expired.' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // 2. Insert new guest judge
    const { data: guestJudge, error: insertError } = await supabase
      .from('guest_judges')
      .insert([{ event_id: event.id, name }])
      .select('id')
      .single();

    if (insertError || !guestJudge) {
      console.error('Error creating guest judge:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to join event.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Set cookie
    const sessionData = {
      guest_judge_id: guestJudge.id,
      event_id: event.id,
      name,
    };

    const cookieStore = await cookies();
    cookieStore.set('guest_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // Removed maxAge to make it a session cookie (expires when tab/browser closes)
    });

    return new Response(JSON.stringify({ 
      success: true, 
      event_id: event.id,
      guest_session: sessionData // Return for sessionStorage storage
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Guest login error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
