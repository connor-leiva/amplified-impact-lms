// <LockedWeekPage>: what a locked week shows (/learn/week/N while the week is locked), pixel-identical to the
// #week-1 … #week-8 views of mockup/index.html. A week opens when its live build starts.
// The page: the breadcrumb; "Week N" with a Locked chip, the title and the week's outcome; the hero with when it opens,
// the week's question, one button that downloads the week's sessions as a calendar file, the way back to the open
// week, and the countdown; then "Build it live": the week's sessions, one row each.
// Nothing on this page links into the week. It renders only the page ([data-locked-page]); <AppShell> goes around it.
//
// Props
//   week   { n, title, outcome, question, opens, opensAt (ISO), sessions[{ title, kind, when, tile[2] }], calendarHref,
//            back { label, href }, crumbs[{ label, href? }] }                     (sample-data.js › sampleLockedWeek)
//   now    () => ms, defaults to Date.now (tests pin the clock)
// D-225: `handoff/lms-v3/src/LockedWeekPage.jsx`, converted to TSX and nothing else.
import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { IconSprite, Icon } from './Icons';
import { RollLabel } from '@brand/ai-motion';
import type { MotionStyle } from '@brand/ai-motion';
import { addLabel, countdown } from './session';
import type { LockedWeekProps } from './types';

const stop = (href: string) => (href === '#' ? (e: MouseEvent) => e.preventDefault() : undefined);

export function LockedWeekPage({ week, now = Date.now }: { week: LockedWeekProps; now?: () => number }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(id); }, []);
  const mins = Math.floor((Date.parse(week.opensAt) - now()) / 60000);
  return (
    <div data-ai="locked" data-locked-page="" id="view-locked">
      <IconSprite />
      <div className="wk-page">
        <nav className="wk-crumbs aim-rise" style={{ '--i': 0 } as MotionStyle} aria-label="Breadcrumb">
          {week.crumbs.map((c, i) => [
            i > 0 && <span key={'s' + i} aria-hidden="true">/</span>,
            c.href ? <a key={c.label} href={c.href} onClick={stop(c.href)}>{c.label}</a> : <span key={c.label}>{c.label}</span>,
          ])}
        </nav>
        <header className="wk-head aim-rise" style={{ '--i': 0 } as MotionStyle}>
          <p className="wk-eyebrow">{`Week ${week.n} `}<span className="wk-open" data-s="locked"><Icon name="lock" size={12} />Locked</span></p>
          <h1 className="wk-h1">{week.title}</h1>
          <p className="wk-purpose">{week.outcome}</p>
        </header>
        <section className="wk-hero aim-rise" style={{ '--i': 1 } as MotionStyle} aria-label="When this week opens">
          <div className="wk-hero-main">
            <p className="wk-kick">{`Opens ${week.opens}`}</p>
            <h2 className="wk-hero-t">{week.question}</h2>
            <div className="wk-hero-acts">
              <a className="wk-btn wk-btn-accent wk-btn-lg" id="lk-cal" href={week.calendarHref} onClick={stop(week.calendarHref)}><Icon name="calplus" size={16} /><RollLabel>{addLabel(week.sessions.length)}</RollLabel></a>
              <a className="wk-btn wk-btn-onforest wk-btn-lg wk-btn-arrow" id="lk-back" href={week.back.href} onClick={stop(week.back.href)}><RollLabel>{week.back.label}</RollLabel><Icon name="arrow" size={16} className="wk-arrow" /></a>
            </div>
          </div>
          <div className="wk-prog">
            <p className="wk-prog-l"><Icon name="clock" />Opens in</p>
            <p className="sc-count">{countdown(mins).map(([n, u]) => <span key={u}><b>{n}</b>{u}</span>)}</p>
          </div>
        </section>
        <section className="aim-rise" style={{ '--i': 2 } as MotionStyle} aria-labelledby="lk-h">
          <h2 className="wk-h2" id="lk-h">Build it live</h2>
          <ul className="sc-list lk-list">
            {week.sessions.map((s) => (
              <li className="sc-week lk-row" key={s.title}>
                <span className="sc-date" aria-hidden="true"><small>{s.tile[0]}</small><b>{s.tile[1]}</b></span>
                <div className="sc-body"><b>{s.title}</b><p className="sc-d">{`${s.kind} · ${s.when}`}</p></div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default LockedWeekPage;
