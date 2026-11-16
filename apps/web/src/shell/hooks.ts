import { useEffect, useState } from 'react';

// The shell's own hooks, shared by the learner AppShell and the admin AppShell (D-160 R2-1b): moved
// here from AppShell.tsx unchanged.

/**
 * Viewport width.
 *
 * Read from BOTH a ResizeObserver on the documentElement AND `window.innerWidth` on every render,
 * exactly as the prototype does: it once got stuck in drawer mode when it started hidden, because
 * a `resize` event never arrived for a tab that was never resized.
 */
export function useViewportWidth(): number {
  const [vw, setVw] = useState(() => window.innerWidth);

  useEffect(() => {
    const read = () => setVw(window.innerWidth);
    window.addEventListener('resize', read);
    read();
    const raf = requestAnimationFrame(read);
    let ro: ResizeObserver | undefined;
    try {
      ro = new ResizeObserver(read);
      ro.observe(document.documentElement);
    } catch {
      /* no ResizeObserver: the resize listener alone still tracks the window */
    }
    return () => {
      window.removeEventListener('resize', read);
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  return window.innerWidth || vw;
}

/** `data-app-ready` goes on the body once this component has rendered — so the snapshot has
 *  resolved, because `useDb()` suspends until it has — and the fonts have settled. Not while the
 *  shell is only passing a learner on to the Skill Library (D-150), which marks itself. */
export function useAppReady(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const mark = () => {
      if (alive) document.body.dataset.appReady = 'true';
    };
    const fonts: FontFaceSet | undefined = document.fonts;
    if (fonts) void fonts.ready.then(mark, mark);
    else mark();
    return () => {
      alive = false;
    };
  }, [enabled]);
}
