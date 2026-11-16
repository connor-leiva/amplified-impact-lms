import type { ReactNode } from 'react';
import { Page } from '../../components/r2/Page';
import { Skel } from '../../components/r2/kit';
import type { ConsoleApi } from '../../data/console';
import type { ConsoleMe } from '@ai/core';
import { CONSOLE_SCREENS } from './console.vm';
import type { ConsoleScreen } from './console.vm';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleRecord } from './useConsoleData';
import { useConsoleGate } from './useConsoleGate';

// The Operations pages' frame (D-168): the Console gate, one read, and the mockup's `Gate` around the
// page's body (a loading card, the error with Retry), under the page head that never waits. Denied for
// a role without `ops.read` (Support, D3), from the gate or from the API's own 403.

export function OpsFrame<T>({
  screen,
  head,
  read,
  lines,
  children,
}: {
  screen: ConsoleScreen;
  head: ReactNode;
  read: (api: ConsoleApi) => Promise<T>;
  /** The loading card's lines (the mockup's `Gate n`). */
  lines: number;
  children: (data: T, ctx: { api: ConsoleApi; me: ConsoleMe; reload: () => void }) => ReactNode;
}) {
  const gate = useConsoleGate(screen);
  const api = gate.kind === 'ready' ? gate.api : null;
  const rec = useConsoleRecord(api, read, screen);
  if (gate.kind === 'hidden') return null;
  const title = CONSOLE_SCREENS[screen].title;
  if (gate.kind === 'denied') return <Denied what={title} role={gate.role} />;
  if (gate.kind === 'ready' && rec.status === 'error' && rec.failure === 'forbidden') return <Denied what={title} role={gate.me.role} />;
  let body: ReactNode;
  if (gate.kind === 'error') body = <LoadError failure={gate.failure} retry={gate.retry} />;
  else if (gate.kind === 'loading' || rec.status === 'loading') body = <Skel lines={lines} />;
  else if (rec.status === 'error') body = <LoadError failure={rec.failure ?? 'failed'} retry={rec.retry} />;
  else body = children(rec.data as T, { api: gate.api, me: gate.me, reload: rec.retry });
  return (
    <Page>
      {head}
      {body}
    </Page>
  );
}
