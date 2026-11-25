import { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router';
import { setTimeStyle } from '@ai/core';
import { MASQUERADE_BLOCKED_EVENT } from '../data/http';
import type { MasqueradeBlockedDetail } from '../data/http';
import { masquerade, useMasquerade } from '../data/masquerade';
import { timeStyleFor } from '../lib/timeStyle';

// The router's root (D-162 3b, spec § 6): every route renders inside it, so a masquerade shows on
// every page, the learner portal, the pages outside its shell (/course, /skill-library, /account …)
// and the Console alike.
//
// WITHOUT A SESSION IT ADDS NOTHING. The page is the route's own element, first, unchanged; the
// banner, the dialogs and their styles are separate chunks loaded only once a session is known. So no
// learner page, golden or parity scenario moves (none of them has a session).
//
// WITH ONE: the banner above the page; every `/admin/*` address is the paused Console (D2), decided
// here, ahead of the learner shell's bounce; and a refused write opens the blocked dialog. On an
// `/admin/*` address the page waits for the first answer, so the Console never draws (or asks the
// API for anything) during a session.

const Layer = lazy(() => import('../components/masquerade/Layer'));
const Paused = lazy(() => import('../components/masquerade/ConsolePaused'));

const POLL_MS = 30_000;

export const isAdminPath = (p: string): boolean => p === '/admin' || p.startsWith('/admin/');

export function MasqueradeRoot() {
  const outlet = useOutlet();
  const { pathname } = useLocation();
  const admin = isAdminPath(pathname);
  // D-259: the learner portal's times with LMS v3 on, set before the page draws (`lib/timeStyle.ts`).
  setTimeStyle(timeStyleFor(admin));
  const st = useMasquerade();
  const [blocked, setBlocked] = useState<MasqueradeBlockedDetail | null>(null);
  const active = st.status === 'active';

  useEffect(() => {
    void masquerade.refresh();
    const onBlocked = (e: Event) => {
      setBlocked({ attempt: (e as CustomEvent<MasqueradeBlockedDetail>).detail?.attempt ?? null });
      void masquerade.refresh();
    };
    window.addEventListener(MASQUERADE_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(MASQUERADE_BLOCKED_EVENT, onBlocked);
  }, []);

  // While a session runs: ask again every 30 seconds and whenever the tab comes back.
  useEffect(() => {
    if (!active) return;
    const again = () => {
      if (document.visibilityState !== 'hidden') void masquerade.refresh();
    };
    const t = setInterval(again, POLL_MS);
    window.addEventListener('focus', again);
    document.addEventListener('visibilitychange', again);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', again);
      document.removeEventListener('visibilitychange', again);
    };
  }, [active]);

  // The page keeps its place (the second child) whether or not a session shows, so it never remounts.
  return (
    <>
      {active ? (
        <Suspense fallback={null}>
          <Layer session={st.session} skew={st.skew} blocked={blocked} onCloseBlocked={() => setBlocked(null)} />
        </Suspense>
      ) : null}
      {active && admin ? (
        <Suspense fallback={null}>
          <Paused session={st.session} skew={st.skew} />
        </Suspense>
      ) : admin && st.status === 'unknown' ? null : (
        outlet
      )}
    </>
  );
}
