// <SchedulePage>: the Schedule (/learn/schedule), pixel-identical to the #schedule view of mockup/index.html.
// The hero is the next session: Add to calendar until the join window opens (joinBefore minutes ahead), then Join.
// While it is live the hero says "Live now" and counts the minutes since it started; when it ends the hero moves on.
// Then the nine weeks by month; each week carries its sessions, and its status on the right: the progress bar for
// the week in progress, Deployed, Live now, Next (the week of the next session), or Upcoming. A session's line shows
// its day until it starts, then "Live now", then "Replay processing", then a Watch replay link.
// Motion (Amplified Impact Motion v1): labels roll, the calendar panel unfolds (14), week 0's bar fills over 720 ms.
//
// Props
//   schedule   { sub, next, groups[], calendarAllHref, calendarHref } (sample-data.js › sampleSchedule)
//              calendarAllHref downloads every session as one calendar file: a plain button, no menu.
//   now        () => ms, defaults to Date.now (tests pin the clock)
// D-225: `handoff/lms-v3/src/SchedulePage.jsx`, converted to TSX and nothing else.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { IconSprite, Icon } from './Icons';
import { CalMenu } from './CalMenu';
import { RollLabel } from '@brand/ai-motion';
import type { MotionStyle } from '@brand/ai-motion';
import { countdown, sessionMode } from './session';
import type { ScheduleNext, ScheduleProps, ScheduleSession, ScheduleWeekRow } from './types';

const stop = (href: string | undefined) => (href === '#' ? (e: MouseEvent) => e.preventDefault() : undefined);
const unit = (n: number, u: string) => <span key={u}><b>{n}</b>{u}</span>;

function ViewToggle({ calendarHref }: { calendarHref: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<MotionStyle>({});
  const [live, setLive] = useState(false);
  useLayoutEffect(() => {
    const seg = ref.current; if (!seg) return undefined;
    const place = () => { const b = seg.querySelector<HTMLElement>('[aria-current="true"]')!; setThumb({ '--x': `${b.offsetLeft}px`, '--w': `${b.offsetWidth}px` }); };
    place();
    const ro = new ResizeObserver(place); ro.observe(seg);
    document.fonts?.ready.then(() => { place(); requestAnimationFrame(() => requestAnimationFrame(() => setLive(true))); });
    return () => ro.disconnect();
  }, []);
  return (
    <div className="wk-seg" id="sc-view" role="group" aria-label="View" ref={ref}>
      <span className={'wk-seg-thumb' + (live ? ' live' : '')} style={thumb} aria-hidden="true" />
      <a className="wk-seg-b" href="#schedule" aria-current="true">Weeks</a>
      <a className="wk-seg-b" href={calendarHref} onClick={stop(calendarHref)}>Calendar</a>
    </div>
  );
}

function NextHero({ next, now }: { next: ScheduleNext; now: () => number }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(id); }, []);
  const t = now(), start = Date.parse(next.start), mins = Math.floor((start - t) / 60000);
  const mode = next.mode || sessionMode(next, t);
  return (
    <section className="wk-hero sc-hero aim-rise" style={{ '--i': 1 } as MotionStyle} aria-label="Next session">
      <div className="wk-hero-main" id="sc-hero">
        <div className="sc-next">
          <span className="sc-date" aria-hidden="true"><small>{next.day}</small><b>{next.date}</b></span>
          <div>
            <p className="wk-kick">{`${mode === 'live' ? 'Live now' : 'Next'} · Week ${next.week} · ${next.kind}`}</p>
            <h2 className="wk-hero-t">{next.title}</h2>
            <p className="wk-hero-m"><span>{next.when}</span><span>{next.length}</span><span>{next.where}</span></p>
            <div className="wk-hero-acts">
              {mode === 'wait'
                ? <CalMenu label="Add to calendar" items={next.calendar} variant="wk-btn-accent wk-btn-lg" />
                : <a className="wk-btn wk-btn-accent wk-btn-lg wk-btn-arrow" id="sc-join" href={next.joinHref} onClick={stop(next.joinHref)}><Icon name="video" size={16} /><RollLabel>{`Join on ${next.where}`}</RollLabel></a>}
              <a className="wk-btn wk-btn-onforest wk-btn-lg wk-btn-arrow" id="sc-what" href={next.weekHref} onClick={stop(next.weekHref)}><RollLabel>{next.cta}</RollLabel><Icon name="arrow" size={16} className="wk-arrow" /></a>
            </div>
            {mode === 'wait' && <p className="sc-note">{`Join opens ${next.joinBefore} minutes before.`}</p>}
          </div>
        </div>
      </div>
      <div className="wk-prog">
        <p className="wk-prog-l" id="sc-count-l"><Icon name="clock" />{mode === 'live' ? 'Started' : 'Starts in'}</p>
        <p className="sc-count" id="sc-count">
          {mode === 'live' ? unit(Math.floor((t - start) / 60000), 'min ago') : countdown(mins).map(([n, u]) => unit(n, u))}
        </p>
      </div>
    </section>
  );
}

const OVER: Record<string, string> = { processing: 'Replay processing', ended: 'Session ended' };
/** A session's line ends with its day, or with what it is doing now. s.state: sessionState() or the LMS's own. */
function SessionWhen({ s }: { s: ScheduleSession }) {
  if (s.state === 'live') return <span className="sc-when" data-s="live">Live now</span>;
  if (s.state === 'replay') return <a className="sc-replay" href={s.replayHref} onClick={stop(s.replayHref)}>Watch replay</a>;
  if (OVER[s.state!]) return <span className="sc-when">{OVER[s.state!]}</span>;
  return s.when ? <span className="sc-when">{s.when}</span> : null;
}

function WeekRow({ r }: { r: ScheduleWeekRow }) {
  const side = r.status === 'done' ? <span className="wk-st" data-s="done"><Icon name="check" />Deployed</span>
    : r.status === 'progress' ? <><span className="sc-bar" style={{ '--v': r.done! / r.total! } as MotionStyle} />{`${r.done} of ${r.total} done`}</>
    : r.live ? <span className="wk-st" data-s="live">Live now</span>
    : r.next ? <span className="wk-st" data-s="next">Next</span> : <span className="wk-st" data-s="waiting">Upcoming</span>;
  return (
    <li className="sc-week" data-s={r.status} data-week={r.week}>
      <span className="sc-date" aria-hidden="true"><small>{r.tile[0]}</small><b>{r.tile[1]}</b></span>
      <div className="sc-body">
        <div className="sc-t"><a className="sc-a" href={r.href} onClick={stop(r.href)}>{`Week ${r.week} · ${r.title}`}</a>{r.status === 'progress' && <span className="wk-st" data-s="progress">In progress</span>}</div>
        {r.outcome && <p className="sc-d">{r.outcome}</p>}
        {r.sessions && (
          <ul className="sc-sess">
            {r.sessions.map((s) => <li key={s.title}><Icon name={s.icon} /><span>{s.title}</span><SessionWhen s={s} /></li>)}
          </ul>
        )}
      </div>
      <div className="sc-side">{side}<Icon name="right" size={20} className="wk-chev wk-arrow" /></div>
    </li>
  );
}

export function SchedulePage({ schedule, now = Date.now }: { schedule: ScheduleProps & { next: ScheduleNext }; now?: () => number }) {
  return (
    <div data-ai="schedule" data-schedule-page="" id="view-schedule">
      <IconSprite />
      <div className="wk-page">
        <header className="sc-head aim-rise" style={{ '--i': 0 } as MotionStyle}>
          <div><h1 className="wk-h1">Schedule</h1><p className="wk-purpose">{schedule.sub}</p></div>
          <div className="sc-head-acts">
            <ViewToggle calendarHref={schedule.calendarHref} />
            <a className="wk-btn wk-btn-secondary" id="sc-all" href={schedule.calendarAllHref} onClick={stop(schedule.calendarAllHref)}><Icon name="calplus" /><RollLabel>Add all to calendar</RollLabel></a>
          </div>
        </header>
        <NextHero next={schedule.next} now={now} />
        <section className="aim-rise" style={{ '--i': 2 } as MotionStyle} aria-labelledby="sc-h">
          <h2 className="wk-h2" id="sc-h">{schedule.title}</h2>
          <div id="sc-groups">
            {schedule.groups.map((g) => [
              <h3 className="sc-month" key={g.label}>{g.label}{g.note && <small>{g.note}</small>}</h3>,
              <ol className="sc-list" key={g.label + '-rows'}>
                {g.rows.map((r) => (r.break
                  ? <li className="sc-week sc-break" key={r.break}><span className="sc-date" aria-hidden="true"><Icon name="moon" size={20} /></span><div><b>{r.break}</b><p>{r.text}</p></div></li>
                  : <WeekRow key={(r as ScheduleWeekRow).week} r={r as ScheduleWeekRow} />))}
              </ol>,
            ])}
          </div>
        </section>
      </div>
    </div>
  );
}

export default SchedulePage;
