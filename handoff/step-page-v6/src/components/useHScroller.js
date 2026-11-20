// The one horizontal scroller (chapters): snap, edge fades only on a side with more, arrows, and
// "follow without fighting": a programmatic center() waits 3 s after the learner scrolls it themselves.
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { scrollBehavior } from './motion.js';

export function useHScroller() {
  const row = useRef(null);
  const userUntil = useRef(0);
  const [fade, setFade] = useState({ l: false, r: false });
  const update = useCallback(() => {
    const el = row.current; if (!el) return;
    const max = el.scrollWidth - el.clientWidth - 1;
    const l = el.scrollLeft > 1, r = el.scrollLeft < max;
    setFade((f) => (f.l === l && f.r === r ? f : { l, r }));
  }, []);
  useLayoutEffect(() => {
    const el = row.current; if (!el) return undefined;
    const mark = () => { userUntil.current = Date.now() + 3000; };
    el.addEventListener('scroll', update, { passive: true });
    ['wheel', 'touchstart', 'pointerdown'].forEach((e) => el.addEventListener(e, mark, { passive: true }));
    const ro = new ResizeObserver(update); ro.observe(el);
    update();
    return () => {
      el.removeEventListener('scroll', update);
      ['wheel', 'touchstart', 'pointerdown'].forEach((e) => el.removeEventListener(e, mark));
      ro.disconnect();
    };
  }, [update]);
  const by = (dir) => { userUntil.current = Date.now() + 3000; row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.8, behavior: scrollBehavior() }); };
  const center = useCallback((el, force) => {
    const r = row.current; if (!r || !el) return;
    if (!force && Date.now() < userUntil.current) return;
    r.scrollTo({ left: el.offsetLeft - r.clientWidth / 2 + el.offsetWidth / 2, behavior: force === 'instant' ? 'auto' : scrollBehavior() });
  }, []);
  return { row, fadeL: fade.l, fadeR: fade.r, prev: () => by(-1), next: () => by(1), center };
}
