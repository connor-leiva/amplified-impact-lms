// Reference accordions (native <details>, animated with ::details-content).
// v6: an open header gets a hairline and the list sits 16px under it (no more text against the hover fill).
// Motion: opens over 380 ms on the system curve, closes in 200 ms on the exit curve; rises in with the page (--i 4).
import type { MotionStyle } from '@brand/ai-motion';
import { Icon } from './Icons';
import type { SpAccordion } from './types';

export function Reference({ accordions, title }: { accordions: SpAccordion[]; title: string }) {
  if (!accordions?.length) return null;
  return (
    <section id="reference" className="aim-rise" style={{ '--i': 4 } as MotionStyle} aria-labelledby="ref-h">
      <h2 className="sec-h" id="ref-h">{title}</h2>
      {accordions.map((a) => (
        <details className="acc" key={a.index} open={a.open || undefined}>
          <summary>{a.title} <Icon name="chev" size={18} className="chev" /></summary>
          <ol>{a.body.map((b, i) => <li key={i}>{b}</li>)}</ol>
        </details>
      ))}
    </section>
  );
}
