import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Server-only admin client using the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function POST(request) {
  try {
    const { firebase_uid, email, name } = await request.json();

    if (!firebase_uid || !email) {
      return NextResponse.json(
        { error: 'firebase_uid and email are required' },
        { status: 400 },
      );
    }

    // Fall back to the local part of the email when no display name is set
    const resolvedName = name?.trim() || email.split('@')[0];

    // Insert the user if they don't exist yet; if they do, leave all columns as-is
    // (ignoreDuplicates keeps the existing role for returning users)
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(
        { firebase_uid, email, name: resolvedName, role: 'judge' },
        { onConflict: 'firebase_uid', ignoreDuplicates: true },
      );

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Always fetch the current row (works for both new and existing users)
    const { data, error: selectError } = await supabaseAdmin
      .from('users')
      .select()
      .eq('firebase_uid', firebase_uid)
      .single();

    if (selectError) {
      console.error('Supabase select error:', selectError);
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    return NextResponse.json({ user: data }, { status: 200 });
  } catch (err) {
    console.error('sync-user error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
