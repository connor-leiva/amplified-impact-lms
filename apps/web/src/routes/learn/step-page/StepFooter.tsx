// Mark step done (centered card; stays forest while locked and, when clicked, explains and jumps to the first
// unchecked item), Undo, and the Next card.
// Motion (Amplified Impact Motion v1):
//   Mark step done is the brand's async button (03), idle -> done: the label rolls up and out, the done layer rises,
//   the dot lands and the ring draws once. Layers share one grid cell so the width never jumps. The hover rolls the label.
//   The "why" line and the Undo row arrive as messages (aim-msg-in, 240 ms).
//   The Next card's fill lightens on hover, its bar grows like an underline (380 ms), its arrow nudges on the spring.
import { useEffect, useRef } from 'react';
import { RollLabel, SignalMark } from '@brand/ai-motion';
import { Icon, MarkCheck } from './Icons';
import type { SpLabels, SpNext } from './types';

export function MarkDone({ done, locked, why, nudge, onMark, onUndo, labels }: {
  done: boolean; locked: boolean; why: string; nudge: boolean; onMark: () => void; onUndo: () => void; labels: SpLabels;
}) {
  // The why line plays its arrival whenever its words change (not on first render, as in the mockup).
  const changed = useRef(false);
  const lastWhy = useRef(why);
  useEffect(() => { if (lastWhy.current !== why) { changed.current = true; lastWhy.current = why; } }, [why]);
  const animate = changed.current || lastWhy.current !== why;
  return (
    <div className="mark-card">
      <button className={'btn btn-primary btn-lg mark-btn aim-async' + (done ? ' is-done' : '')} type="button" id="mark" data-state={done ? 'done' : 'idle'}
        aria-disabled={locked ? 'true' : 'false'} aria-describedby="why" onClick={onMark}>
        <span className="aim-async__label" id="mark-lbl" aria-hidden={done ? 'true' : 'false'}>
          <MarkCheck weight="2.2" /><RollLabel>{labels.markDone}</RollLabel>
        </span>
        <span className="aim-async__done" aria-hidden={done ? 'false' : 'true'}>
          <SignalMark />{labels.stepDone}
        </span>
      </button>
      <p key={why} className={'why' + (animate ? ' msg' : '') + (nudge ? ' nudge' : '')} id="why">{why}</p>
      <div className="done-row" id="done-row" hidden={!done}><button className="btn btn-ghost btn-sm" type="button" id="undo" onClick={onUndo}>{labels.undo}</button></div>
    </div>
  );
}

export function NextCard({ next, cue, labels }: { next: SpNext | null; cue: boolean; labels: SpLabels }) {
  if (!next) return null;
  return (
    <a className={'card-link next' + (cue ? ' cue-next' : '')} id="next" href={next.href} onClick={next.href === '#' ? (e) => e.preventDefault() : undefined}>
      <span className="k">{labels.nextKicker}</span>
      <span className="t">{`Step ${next.n} · ${next.title}`}</span>
      <span className="m">{next.meta}</span>
      <span className="bar" />
      <span className="arrow" aria-hidden="true"><Icon name="arrow" size={20} /></span>
    </a>
  );
}
