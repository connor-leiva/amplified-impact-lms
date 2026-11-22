// MOCKUP-ONLY. The black MOCKUP bar with its Preview buttons, so the harness renders the same full page as the mockup.
import { useEffect, useRef } from 'react';
import { FLAG } from './mock.generated.js';

const GROUPS = ['preview', 'clock', 'form', 'turnin', 'as'];
/** picked: { preview, clock, form, as }; onPick(group, value). "Open turn in" buttons have no pressed state: they open the drawer. */
export function MockBar({ picked, onPick }) {
  const ref = useRef(null);
  useEffect(() => {
    GROUPS.forEach((g) => ref.current.querySelectorAll(`[data-${g}]`).forEach((b) => b.hasAttribute('aria-pressed') && b.setAttribute('aria-pressed', b.dataset[g] === picked[g] ? 'true' : 'false')));
  }, [picked.preview, picked.clock, picked.form, picked.as]);
  const click = (e) => { const b = e.target.closest('button'); if (!b) return; const g = GROUPS.find((x) => b.dataset[x] != null); if (g) onPick(g, b.dataset[g]); };
  return <div ref={ref} style={{ display: 'contents' }} onClick={click} dangerouslySetInnerHTML={{ __html: FLAG }} />;
}
