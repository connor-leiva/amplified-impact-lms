// Back link, eyebrow, title, goal line, the three tags and the checklist progress row.
// Motion: the header rises in with the page (--i 1); the bar fills on the system curve over 720 ms
// while "N of 4 checked" counts with it (useCountUp, brand 12).
import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useCountUp } from '@brand/ai-motion';
import type { MotionStyle } from '@brand/ai-motion';
import { Icon } from './Icons';
import type { SpLabels, SpLink, SpStep } from './types';

export function BackLink({ back }: { back: SpLink }) {
  return (
    <a className="btn btn-ghost back aim-rise" style={{ '--i': 0 } as MotionStyle} href={back.href} onClick={back.href === '#' ? (e) => e.preventDefault() : undefined}>
      <Icon name="left" />{back.label}
    </a>
  );
}

/** A path chosen with the keyboard: the page draws again for the new path, so its tab takes focus once it is back. */
let refocus: string | null = null;

/** D-210: the step's paths as one segmented control (a radio group: arrow keys move between them). */
export function PathTabs({ step }: { step: SpStep }) {
  const tabs = step.tabs ?? [];
  const on = step.tab ?? tabs[0]?.id;
  const group = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!refocus || refocus !== on) return;
    refocus = null;
    group.current?.querySelector<HTMLButtonElement>(`[data-tab="${on}"]`)?.focus();
  }, [on]);
  if (tabs.length < 2) return null;
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === on);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]!;
    refocus = next.id;
    step.onTab?.(next.id);
  };
  return (
    <div className="seg" role="radiogroup" aria-label={step.tabsLabel} onKeyDown={onKey} ref={group}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="radio" data-tab={t.id} aria-checked={t.id === on ? 'true' : 'false'} tabIndex={t.id === on ? 0 : -1}
          onClick={() => step.onTab?.(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function StepHeader({ step, done, total, labels }: { step: SpStep; done: number; total: number; labels: SpLabels }) {
  const shown = useCountUp(done, 720);
  return (
    <header className="head aim-rise" style={{ '--i': 1 } as MotionStyle}>
      <p className="eyebrow">{step.eyebrow}</p>
      <h1 className="h1">{step.title}</h1>
      {step.lede && <p className="purpose">{step.lede}</p>}
      <div className="meta">
        {step.tags.map((t) => (
          <span className="tag" key={t.label}><Icon name={t.icon} size={14} />{t.label}</span>
        ))}
        <PathTabs step={step} />
      </div>
      <div className="prog">
        <div className="prog-track" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={labels.checkProgress} id="prog">
          <div className="prog-fill" id="prog-fill" style={{ '--pct': done / total } as MotionStyle} />
        </div>
        <span className="prog-l" id="prog-l">{`${Math.round(shown)} ${labels.of} ${total} ${labels.checked}`}</span>
      </div>
    </header>
  );
}
