// D-195: the Start Here card. The words and the rows come from the view-model. On a week page it is a
// section. On step 1 it is open, and its title is the summary, not a heading above the step's own.

import { Link } from 'react-router';
import type { StartHereVM } from './Week.vm';
import s from './StartHere.module.css';

function Body({ card }: { card: StartHereVM }) {
  return (
    <>
      <p className={s.sub}>{card.sub}</p>
      <p className={s.line}>{card.line}</p>
      <p className={s.totals}>
        <span>Owner · {card.owner}</span>
        <span>AI Implementer · {card.operator}</span>
      </p>
      <p className={s.hint}>{card.hint}</p>
      <ul className={s.rows}>
        {card.rows.map((row) => (
          <li key={row.n}>
            <Link className={s.row} to={row.href} data-current={row.current ? 'true' : undefined} aria-current={row.current ? 'step' : undefined}>
              <span>{row.n}</span>
              <span>
                <span className={s.name}>{row.title}</span>
                {row.meta ? <span className={s.meta}>{row.meta}</span> : null}
              </span>
              <span className={s.status}>{row.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function StartHereCard({ card, collapsible = false }: { card: StartHereVM; collapsible?: boolean }) {
  if (collapsible) {
    return (
      <details className={s.card} open>
        <summary className={s.sum}>{card.title}</summary>
        <Body card={card} />
      </details>
    );
  }
  return (
    <section className={s.card} aria-labelledby="start-here-title">
      <h2 className={s.title} id="start-here-title">{card.title}</h2>
      <Body card={card} />
    </section>
  );
}
