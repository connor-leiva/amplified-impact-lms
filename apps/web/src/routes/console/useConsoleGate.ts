import { useCallback, useEffect, useState } from 'react';
import { consoleCan } from '@ai/core';
import type { ConsoleMe } from '@ai/core';
import { useDb, useViewer } from '../../data/hooks';
import { ConsoleError, consoleApi } from '../../data/console';
import type { ConsoleApi, ConsoleFailure } from '../../data/console';
import { CONSOLE_SCREENS } from './console.vm';
import type { ConsoleScreen } from './console.vm';

// Who may open a Console screen (D-157). The server decides (`GET /api/console/me`); this only reads
// its answer. A learner never gets here (AppShell sends them to their portal), so for one the screen
// renders nothing while that happens.

export type Gate =
  | { kind: 'hidden' }
  | { kind: 'loading' }
  | { kind: 'denied'; role: string | null }
  | { kind: 'error'; failure: ConsoleFailure; retry: () => void }
  | { kind: 'ready'; api: ConsoleApi; me: ConsoleMe };

export function useConsoleGate(screen: ConsoleScreen | null): Gate {
  const viewer = useViewer();
  const db = useDb();
  const staff = viewer.actor.kind === 'staff';
  const staffId = viewer.actor.kind === 'staff' ? viewer.actor.staffId : null;
  const snapshotRole = db.staff.find((x) => x.id === staffId)?.role ?? null;
  const [gate, setGate] = useState<Gate>(staff ? { kind: 'loading' } : { kind: 'hidden' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!staff) {
      setGate({ kind: 'hidden' });
      return;
    }
    let alive = true;
    setGate({ kind: 'loading' });
    void (async () => {
      try {
        const api = await consoleApi();
        const me = await api.me();
        if (!alive) return;
        if (screen && !consoleCan(me.role, CONSOLE_SCREENS[screen].cap)) setGate({ kind: 'denied', role: me.role });
        else setGate({ kind: 'ready', api, me });
      } catch (e) {
        if (!alive) return;
        const failure: ConsoleFailure = e instanceof ConsoleError ? e.kind : 'failed';
        setGate(failure === 'forbidden' ? { kind: 'denied', role: snapshotRole } : { kind: 'error', failure, retry });
      }
    })();
    return () => {
      alive = false;
    };
  }, [attempt, retry, screen, snapshotRole, staff]);

  return gate;
}
