import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getGuestUser } from '@/lib/apiAuth';

export async function GET(request) {
  const user = await getAuthenticatedUser(request);
  if (user) {
    return NextResponse.json({
      type: 'user',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  }

  const guest = getGuestUser(request);
  if (guest) {
    return NextResponse.json({
      type: 'guest',
      user: {
        id: guest.id,
        name: guest.name,
        role: 'guest_judge',
        event_id: guest.event_id,
      },
    });
  }

  return NextResponse.json({ type: 'none' });
}
