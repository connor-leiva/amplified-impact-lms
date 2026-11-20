// Reference accordions (native <details>, animated with ::details-content).
// v6: an open header gets a hairline and the list sits 16px under it (no more text against the hover fill).
// Motion: opens over 380 ms on the system curve, closes in 200 ms on the exit curve; rises in with the page (--i 4).
import { Icon } from './Icons.jsx';

export function Reference({ accordions, title }) {
  if (!accordions?.length) return null;
  return (
    <section id="reference" className="aim-rise" style={{ '--i': 4 }} aria-labelledby="ref-h">
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
