import { useEffect, useRef, useState } from 'react';
import { BILLING_READ, consoleApi } from '../../data/console';

// R-5 Phase 8 (D-269; PLAN.md § 8 and § 10.8, Connor's call on #270): the sidebar's Revenue "3 failed", the count of the
// Failed list, from `GET /api/console/billing/failed-count`: what Billing already holds in memory, never a Stripe call
// per page view. Read when the shell mounts, again once Revenue or Payments has read Billing (`BILLING_READ`), and on
// navigation at most once a minute, as the open incidents are (`useOpenIncidents`). Zero (no roll-up) while unknown,
// when it fails, or for a role that can't read billing. The parity fixture's roll-up is its own (`parity-r2.ts`).

const EVERY_MS = 60_000;

export function useFailedPayments(enabled: boolean, pathname: string): number {
  const [failed, setFailed] = useState(0);
  const last = useRef(-Infinity);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    const again = () => {
      last.current = -Infinity;
      setBump((n) => n + 1);
    };
    window.addEventListener(BILLING_READ, again);
    return () => window.removeEventListener(BILLING_READ, again);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setFailed(0);
      return;
    }
    const now = Date.now();
    if (now - last.current < EVERY_MS) return;
    last.current = now;
    let alive = true;
    consoleApi()
      .then((api) => api.billingFailedCount())
      .then(
        (s) => alive && setFailed(s.failed ?? 0),
        () => alive && setFailed(0),
      );
    return () => {
      alive = false;
    };
  }, [enabled, pathname, bump]);

  return enabled ? failed : 0;
}
