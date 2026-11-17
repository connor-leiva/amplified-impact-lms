import { useEffect, useRef, useState } from 'react';
import { INCIDENTS_CHANGED, consoleApi } from '../../data/console';

// The sidebar's "1 incident" in production (D-167): how many incidents are open and not yet
// acknowledged, from `GET /api/console/incidents/summary`. Read when the shell mounts, again after an
// incident screen changes one (`INCIDENTS_CHANGED`), and on navigation at most once a minute, so it
// never spends the Console's read limit. Zero (no badge) until it answers, when it fails, or when the
// viewer can't read incidents. The parity fixture's badge is its own (`parity-r2.ts`), not this.

const EVERY_MS = 60_000;

export function useOpenIncidents(enabled: boolean, pathname: string): number {
  const [open, setOpen] = useState(0);
  const last = useRef(-Infinity);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    const again = () => {
      last.current = -Infinity;
      setBump((n) => n + 1);
    };
    window.addEventListener(INCIDENTS_CHANGED, again);
    return () => window.removeEventListener(INCIDENTS_CHANGED, again);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setOpen(0);
      return;
    }
    const now = Date.now();
    if (now - last.current < EVERY_MS) return;
    last.current = now;
    let alive = true;
    consoleApi()
      .then((api) => api.incidentSummary())
      .then(
        (s) => alive && setOpen(s.open),
        () => alive && setOpen(0),
      );
    return () => {
      alive = false;
    };
  }, [enabled, pathname, bump]);

  return enabled ? open : 0;
}
