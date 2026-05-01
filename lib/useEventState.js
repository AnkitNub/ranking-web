'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { authFetch } from '@/lib/authFetch';

const ACTIVE_INTERVAL_MS = 1000;
const IDLE_INTERVAL_MS = 5000;

// Polls /api/events/[id]/state on a cadence that depends on event status,
// pauses when the tab is hidden, and exposes a refetch() for after writes.
export function useEventState(eventId) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const inflightRef = useRef(null);
  const timeoutRef = useRef(null);
  const cancelledRef = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (!eventId) return null;
    if (inflightRef.current) return inflightRef.current;
    const p = (async () => {
      try {
        const res = await authFetch(`/api/events/${eventId}/state`);
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return null;
        }
        const json = await res.json();
        setError(null);
        setState(json.state);
        return json.state;
      } catch (e) {
        setError(e.message ?? 'fetch failed');
        return null;
      } finally {
        inflightRef.current = null;
      }
    })();
    inflightRef.current = p;
    return p;
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return undefined;
    cancelledRef.current = false;

    const schedule = (delay) => {
      if (cancelledRef.current) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(loop, delay);
    };

    const loop = async () => {
      if (cancelledRef.current) return;
      if (typeof document !== 'undefined' && document.hidden) {
        schedule(IDLE_INTERVAL_MS);
        return;
      }
      const next = await fetchOnce();
      const interval =
        next?.status === 'active' ? ACTIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
      schedule(interval);
    };

    loop();

    const onVisibility = () => {
      if (!document.hidden) {
        // Wake immediately when the tab is refocused.
        schedule(0);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelledRef.current = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [eventId, fetchOnce]);

  return { state, error, refetch: fetchOnce };
}

// Server-anchored countdown. Use turn_expires_at_ms + the server_now_ms
// snapshot from the same response to neutralize client clock skew.
export function useCountdown(expiresAtMs, serverNowMs) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!expiresAtMs) return undefined;
    const skew = serverNowMs ? Date.now() - serverNowMs : 0;
    const tick = () => {
      const remaining = expiresAtMs - (Date.now() - skew);
      setSecondsLeft(Math.max(0, Math.ceil(remaining / 1000)));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [expiresAtMs, serverNowMs]);
  return expiresAtMs ? secondsLeft : 0;
}
