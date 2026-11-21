// Reference: everything on the old page that is not a task, one accordion each (the step page's pattern: an open
// header carries a hairline and the content sits 16px under it). Closed by default.
// Blocks: ul (bullets), dl (term + description; a description can be several paragraphs and a small line),
// scale (the rubric's 0/1/2) and fine (small print). In the LMS, map the week's rich text onto these classes.
// Motion: opens over 380 ms on the system curve, closes in 200 ms on the exit curve.
// D-225: `handoff/lms-v3/src/components/Reference.jsx`, converted to TSX and nothing else.
import type { MouseEvent } from 'react';
import { Icon } from './Icons';
import type { MotionStyle } from '@brand/ai-motion';
import type { RefBlock, WeekLabels, WeekProps } from './types';

function Block({ b }: { b: RefBlock }) {
  if (b.type === 'ul') return <ul className="wk-ul">{b.items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
  if (b.type === 'fine') return <p className="wk-fine">{b.text}</p>;
  if (b.type === 'scale') return <p className="wk-scale">{b.items.map(([n, t]) => <span key={n}><b>{n}</b>{t}</span>)}</p>;
  return (
    <dl className="wk-dl">
      {b.rows.map((r) => (
        <div key={r.dt}><dt>{r.dt}</dt>
          <dd>{Array.isArray(r.dd) ? r.dd.map((p, i) => <p key={i}>{p}</p>) : r.dd}{r.small && <small>{r.small}</small>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Reference({ week, labels }: { week: WeekProps; labels: WeekLabels }) {
  const stop = (href: string) => (href === '#' ? (e: MouseEvent) => e.preventDefault() : undefined);
  return (
    <div className="wk-ref aim-rise" style={{ '--i': 4 } as MotionStyle}>
      <section id="reference" aria-labelledby="ref-h">
        <h2 className="wk-h2" id="ref-h">{labels.reference}</h2>
        <div className="wk-accs" id="wk-accs">
          {week.reference.map((a) => (
            <details className="wk-acc" key={a.title}>
              <summary>{a.title}<Icon name="chev" size={18} /></summary>
              <div className="wk-acc-b">{a.blocks.map((b, i) => <Block key={i} b={b} />)}</div>
            </details>
          ))}
        </div>
      </section>
      {week.next && (
        <a className="wk-nextweek" id="wk-nextweek" href={week.next.href} onClick={stop(week.next.href)}>
          <span><small className="wk-label">{labels.nextWeek}</small>{`Week ${week.next.n} · ${week.next.title}`}</span><Icon name="arrow" size={20} className="wk-arrow" />
        </a>
      )}
    </div>
  );
}
