import { NextResponse } from 'next/server';

export async function POST(request) {
  const response = NextResponse.json({ success: true });

  // Clear the guest_session cookie
  response.cookies.set('guest_session', '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}
