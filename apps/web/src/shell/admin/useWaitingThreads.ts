import { useEffect, useRef, useState } from 'react';
import { COMMUNITY_CHANGED, consoleApi } from '../../data/console';

// The sidebar's "3 waiting" (D-238, ADMIN-SIDEBAR-SPEC.md § 3): how many of the Community's threads end with a
// member's word, from staff's `GET /api/community` (each thread's `waiting`). Read when the shell mounts, again after
// a Community screen changes a thread (`COMMUNITY_CHANGED`), and on navigation at most once a minute, as the open
// incidents are (`useOpenIncidents`). Zero (no badge) until it answers, when it fails, or for a role that can't open
// the Console. The parity fixture's sidebar has no Community row, so it has no count either.

const EVERY_MS = 60_000;

export function useWaitingThreads(enabled: boolean, pathname: string): number {
  const [waiting, setWaiting] = useState(0);
  const last = useRef(-Infinity);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    const again = () => {
      last.current = -Infinity;
      setBump((n) => n + 1);
    };
    window.addEventListener(COMMUNITY_CHANGED, again);
    return () => window.removeEventListener(COMMUNITY_CHANGED, again);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setWaiting(0);
      return;
    }
    const now = Date.now();
    if (now - last.current < EVERY_MS) return;
    last.current = now;
    let alive = true;
    consoleApi()
      .then((api) => api.community())
      .then(
        (list) => alive && setWaiting(list.threads.filter((t) => t.waiting).length),
        () => alive && setWaiting(0),
      );
    return () => {
      alive = false;
    };
  }, [enabled, pathname, bump]);

  return enabled ? waiting : 0;
}
