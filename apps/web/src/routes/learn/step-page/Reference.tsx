// Reference accordions (native <details>, animated with ::details-content).
// v6: an open header gets a hairline and the list sits 16px under it (no more text against the hover fill).
// Motion: opens over 380 ms on the system curve, closes in 200 ms on the exit curve; rises in with the page (--i 4).
// D-210: a row can also carry rich text (in place of the list), a table and a link; its open state is remembered.
import type { MotionStyle } from '@brand/ai-motion';
import { Icon } from './Icons';
import type { SpAccordion } from './types';

export function RtTable({ t }: { t: { head?: string[]; rows: string[][] } }) {
  return (
    <div className="rt-table">
      <table>
        {t.head ? <thead><tr>{t.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead> : null}
        <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Reference({ accordions, title, onToggle }: { accordions: SpAccordion[]; title: string; onToggle?: (index: number, open: boolean) => void }) {
  if (!accordions?.length) return null;
  return (
    <section id="reference" className="aim-rise" style={{ '--i': 4 } as MotionStyle} aria-labelledby="ref-h">
      <h2 className="sec-h" id="ref-h">{title}</h2>
      {accordions.map((a) => (
        <details className="acc" key={a.index} open={a.open || undefined}
          onToggle={onToggle ? (e) => { if (e.currentTarget.open !== a.open) onToggle(a.index, e.currentTarget.open); } : undefined}>
          <summary>{a.title} <Icon name="chev" size={18} className="chev" /></summary>
          {a.bodyNode ? <div className="acc-body">{a.bodyNode}</div> : a.body.length ? <ol>{a.body.map((b, i) => <li key={i}>{b}</li>)}</ol> : null}
          {a.table ? <RtTable t={a.table} /> : null}
          {a.link ? <p className="acc-link"><a className="inline" href={a.link.href} {...(/^https?:/.test(a.link.href) ? { target: '_blank', rel: 'noopener' } : {})}>{a.link.label}</a></p> : null}
        </details>
      ))}
    </section>
  );
}
