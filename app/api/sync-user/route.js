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

    // Try to safely upsert the user first, avoiding race conditions
    // ignoreDuplicates: true means it won't overwrite existing users on insert
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

    // After ensuring the user exists, fetch their current data
    const { data: existingUser, error: selectError } = await supabaseAdmin
      .from('users')
      .select()
      .eq('firebase_uid', firebase_uid)
      .single();

    if (selectError) {
      console.error('Supabase select error:', selectError);
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    // User exists. Update name if a valid one is provided and differs
    let finalUser = existingUser;
    if (name && name.trim() && existingUser.name !== name.trim()) {
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ name: name.trim() })
        .eq('firebase_uid', firebase_uid)
        .select()
        .single();

      if (updateError) {
        console.error('Supabase update error:', updateError);
        // non-fatal, proceed with existing
      } else if (updatedUser) {
        finalUser = updatedUser;
      }
    }

    return NextResponse.json({ user: finalUser }, { status: 200 });
  } catch (err) {
    console.error('sync-user error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
