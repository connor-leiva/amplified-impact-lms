// The app shell every page sits in: the side nav and the top bar.
// Side nav: main links; Weeks, a nav row like the others with its own icon, and the nine weeks falling in under it
// along a guide line: numbered, full titles (they wrap rather than cut off), a status only when there is something to
// say (a progress ring and "7 of 8", or a check); Get help; Collapse (a 64px rail of icons, with the week numbers in a
// tray under the Weeks icon). On
// phones it folds behind a Menu button.
// Top bar: the next session and the account menu's trigger (the learner's initials). The strip has three modes:
// next (label, title, when, one Add to calendar menu), starting soon (the join window is open: Join) and live now
// (a "Live now" pill, "Started 1:00 PM CT", Join). Locked weeks carry a lock, a quiet label and an outlined number.
// `now` () => ms, defaults to Date.now. The LMS may pass shell.next.mode itself and skip the clock. The header also holds the breadcrumb for screen readers; <main id="main"> wraps the page. Pages whose own hero is the next
// live build (Schedule) pass hideNext.
// The logo is the brand's own file (shell.logo.app): the "ai academy" app lockup at 161×34. There is one logo: the
// collapsed rail shows the same file through a 26px window, its "ai" (lms.css: .sh-logo and [data-narrow]).
// Motion (Amplified Impact Motion v1, 10): one marker on the sidebar's hairline springs to the current item; hover
// nudges a label 3px forward; the ring fills over 720 ms.
// Collapse and expand travel (lms.css, section 15): [data-narrow] is the column's width, [data-collapsed] the rail's
// layout, [data-anim] says it is moving. Closing: the column narrows on the system's curve; the labels fade for 160 ms,
// then the layout becomes the rail and the icons and week numbers glide into place (FLIP), arriving with the edge.
// Opening: the layout opens behind the edge, the icons and numbers glide out, the labels fade in and the column
// springs open. The logo's window closes to "ai" and opens again with the column (CSS only). Reduced motion and phones: at once.
//   defaultCollapsed  start as the rail (the learner's stored choice)      onCollapse(on)  store the choice
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode, TransitionEvent } from 'react';
import { Icon } from './Icons';
import { CalMenu } from './CalMenu';
import type { CalItem } from './CalMenu';
import { RollLabel, isReducedMotion } from '@brand/ai-motion';
import type { MotionStyle } from '@brand/ai-motion';
import { sessionMode } from './session';
import type { SessionMode } from './session';

// D-225: `handoff/lms-v3/src/components/AppShell.jsx`, converted to TSX and nothing else.
export interface ShellWeek { n: number; title: string; href: string; id?: string; status?: 'idle' | 'progress' | 'done'; done?: number; total?: number; locked?: boolean }
export interface ShellNext { label: string; title: string; when: string; time?: string; where?: string; start: string; minutes?: number; joinBefore: number; joinHref?: string; calendar: CalItem[]; mode?: SessionMode }
export interface Shell {
  homeHref: string;
  helpHref: string;
  logo: { label: string; app: string };
  cohort: [string, string];
  /** D-241: `locked` puts the weeks' lock on a main row (the $37 buyer's Office hours and Weekly training). */
  nav: { icon: string; label: string; href: string; id?: string; locked?: boolean }[];
  weeksLabel: string;
  weeks: ShellWeek[];
  next: ShellNext | null;
  account: { initials: string; aria: string; onClick?: () => void; open?: boolean };
  here: string;
}
type Flip = { before: DOMRect[]; dur: string; ease: string } | null;

const stop = (href: string | undefined) => (href === '#' ? (e: MouseEvent) => e.preventDefault() : undefined);
const cssVar = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const cssMs = (v: string) => parseFloat(cssVar(v));
const MOVERS = '.sh-side .sh-link>svg:first-child,.sh-wn';   // what keeps its identity across the two layouts

function WeekStat({ w }: { w: ShellWeek }) {
  if (w.locked) return <span className="sh-stat" data-s="locked"><Icon name="lock" size={12} /><span className="wk-sr">Locked</span></span>;
  if (w.status === 'done') return <span className="sh-stat" data-s="done"><Icon name="check" /></span>;
  if (w.status !== 'progress') return null;
  return (
    <span className="sh-stat">
      <svg className="sh-ring" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" /><circle cx="7" cy="7" r="5.5" pathLength="1" style={{ '--v': (w.done ?? 0) / (w.total ?? 1) } as MotionStyle} /></svg>
      {`${w.done} of ${w.total}`}
    </span>
  );
}

// D-241: `strip` fills the top bar's strip in place of the next session (the $37 buyer's own skill, one click away).
export function AppShell({ shell, current, hideNext, now = Date.now, defaultCollapsed = false, onCollapse, strip, children }: { shell: Shell; current?: string; hideNext?: boolean; now?: () => number; defaultCollapsed?: boolean; onCollapse?: (on: boolean) => void; strip?: ReactNode; children?: ReactNode }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);   // the rail's layout
  const [narrow, setNarrow] = useState(defaultCollapsed);         // the column's width
  const [anim, setAnim] = useState<'collapsing' | 'expanding' | null>(null);                         // 'collapsing' | 'expanding' | null, while it travels
  const appEl = useRef<HTMLDivElement>(null), narrowNow = useRef(defaultCollapsed), flipFrom = useRef<Flip>(null), collapseT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), swapT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rects = () => [...appEl.current!.querySelectorAll(MOVERS)].map((el) => el.getBoundingClientRect());
  const settle = () => { clearTimeout(collapseT.current); clearTimeout(swapT.current); if (narrowNow.current) setCollapsed(true); setAnim(null); };
  const toggleCollapse = () => {
    const on = !narrow; clearTimeout(collapseT.current); clearTimeout(swapT.current); narrowNow.current = on; onCollapse?.(on);
    if (isReducedMotion() || window.innerWidth <= 900) { setAnim(null); setNarrow(on); setCollapsed(on); return; }
    if (on) {   // the labels fade first; then the layout changes and the icons and numbers glide
      setNarrow(true); setAnim('collapsing');
      swapT.current = setTimeout(() => { flipFrom.current = { before: rects(), dur: '--aim-dur-base', ease: '--aim-ease' }; setCollapsed(true); }, cssMs('--aim-dur-quick'));
      collapseT.current = setTimeout(settle, cssMs('--aim-dur-move') + 80); return;
    }
    flipFrom.current = collapsed ? { before: rects(), dur: '--aim-dur-move', ease: '--aim-ease' } : null;
    setCollapsed(false); setNarrow(false); setAnim('expanding'); collapseT.current = setTimeout(settle, cssMs('--aim-dur-spring') + 80);
  };
  const onColumnEnd = (e: TransitionEvent<HTMLDivElement>) => { if (e.target === e.currentTarget && e.propertyName === 'grid-template-columns') settle(); };
  // FLIP: after the layout has changed, each icon and week number starts where it was and travels to its new place
  useLayoutEffect(() => {
    const f = flipFrom.current; if (!f) return; flipFrom.current = null;
    [...appEl.current!.querySelectorAll(MOVERS)].forEach((el, i) => {
      el.getAnimations().forEach((x) => x.cancel());
      const a = f.before[i], b = el.getBoundingClientRect(); if (!a || !a.width || !b.width) return;
      const dx = a.left - b.left, dy = a.top - b.top; if (!dx && !dy) return;
      try { el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: cssMs(f.dur), easing: cssVar(f.ease) }); } catch { /* an engine without linear() easing: no travel */ }
    });
  }, [collapsed]);
  useEffect(() => () => { clearTimeout(collapseT.current); clearTimeout(swapT.current); }, []);
  const [weeksOpen, setWeeksOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const navShape = shell.weeks.map((w) => `${w.locked ? 'l' : ''}${w.status}${w.done ?? ''}`).join();
  const [mark, setMark] = useState<MotionStyle>({});
  const [live, setLive] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(id); }, []);
  const next = shell.next, mode = next && (next.mode || sessionMode(next, now()));
  useLayoutEffect(() => {
    const sc = scroller.current; if (!sc) return undefined;
    const place = () => {
      const a = sc.querySelector<HTMLElement>('[aria-current="page"]'); const r = a && a.offsetParent ? a.getBoundingClientRect() : null, o = sc.getBoundingClientRect();
      setMark({ '--y': `${r ? r.top - o.top + sc.scrollTop : 0}px`, '--h': `${r ? r.height : 0}px` });
    };
    place();
    const ro = new ResizeObserver(place); ro.observe(sc);
    document.fonts?.ready.then(() => { place(); requestAnimationFrame(() => requestAnimationFrame(() => setLive(true))); });
    return () => ro.disconnect();
  }, [current, collapsed, anim, weeksOpen, menuOpen, navShape]);   // navShape: a week unlocking or gaining a status can re-wrap a row and move the ones under it
  useLayoutEffect(() => { setMenuOpen(false); }, [current]);
  const cur = (id: string | undefined) => (id && id === current ? 'page' : undefined);
  return (
    <div className="sh-app" id="sh-app" ref={appEl} data-collapsed={collapsed ? 'true' : undefined} data-narrow={narrow ? 'true' : undefined} data-anim={anim || undefined} onTransitionEnd={onColumnEnd}>
      <aside className="sh-side" data-ai="shell" id="sh-side" aria-label="Primary" data-open={menuOpen ? 'true' : undefined}>
        <div className="sh-side-in">
          <div className="sh-brand">
            <a className="sh-logo" href={shell.homeHref} onClick={stop(shell.homeHref)} aria-label={shell.logo.label} data-brand-slot=""><img className="sh-logo-l" src={shell.logo.app} width={161} height={34} alt="" /></a>
            <button className="wk-btn wk-btn-ghost wk-btn-sm sh-menu" type="button" id="sh-menu" aria-expanded={menuOpen ? 'true' : 'false'} aria-controls="sh-scroll" onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" size={16} />Menu</button>
            <p className="sh-cohort">{shell.cohort[0]}<br />{shell.cohort[1]}</p>
          </div>
          <div className="sh-scroll" id="sh-scroll" ref={scroller}>
            <nav aria-label="Main">
              <ul className="sh-nav" id="sh-main">
                {shell.nav.map((n) => (
                  <li key={n.label}><a className="sh-link" href={n.href} data-nav={n.id} data-locked={n.locked ? '' : undefined} aria-current={cur(n.id)} onClick={stop(n.href)}><Icon name={n.icon} size={16} /><span className="sh-label">{n.label}</span>{n.locked ? <WeekStat w={{ n: 0, title: '', href: '', locked: true }} /> : null}</a></li>
                ))}
              </ul>
            </nav>
            <button className="sh-link sh-group" type="button" id="sh-group" aria-expanded={weeksOpen ? 'true' : 'false'} aria-controls="sh-weeks" onClick={() => setWeeksOpen(!weeksOpen)}><Icon name="layers" size={16} /><span className="sh-label">{shell.weeksLabel}</span><small>{shell.weeks.length}</small><Icon name="chev" /></button>
            <nav aria-label="Weeks">
              <ul className="sh-nav sh-weeks" id="sh-weeks" hidden={!weeksOpen}>
                {shell.weeks.map((w) => (
                  <li key={w.n}><a className="sh-link sh-week" href={w.href} data-nav={w.id} data-locked={w.locked ? '' : undefined} aria-current={cur(w.id)} onClick={stop(w.href)} title={`Week ${w.n} · ${w.title}`}>
                    <span className="sh-wn" aria-hidden="true">{w.n}</span><span className="sh-label">{w.title}</span><WeekStat w={w} />
                  </a></li>
                ))}
              </ul>
            </nav>
            <span className={'sh-marker' + (live ? ' live' : '')} id="sh-marker" style={mark} aria-hidden="true" />
          </div>
          <ul className="sh-nav sh-foot">
            <li><a className="sh-link" href={shell.helpHref} onClick={stop(shell.helpHref)}><Icon name="help" size={16} /><span className="sh-label">Get help</span></a></li>
            <li><button className="sh-link sh-collapse" type="button" id="sh-collapse" aria-pressed={narrow ? 'true' : 'false'} onClick={toggleCollapse}><Icon name="side" size={16} /><span className="sh-label">{narrow ? 'Expand sidebar' : 'Collapse sidebar'}</span></button></li>
          </ul>
        </div>
      </aside>
      <div className="sh-col">
        <header className="sh-top" data-ai="shell">
          <div className="sh-next" id="sh-next" hidden={hideNext || (!next && !strip)}>
            {strip ?? (next && (mode === 'wait' ? <>
              <span className="sh-live"><Icon name="radio" size={16} />{next.label}</span>
              <b>{next.title}</b>
              <span className="sh-mut">{next.when}</span>
              <CalMenu label="Add to calendar" items={next.calendar} variant="wk-btn-ghost wk-btn-sm" />
            </> : <>
              <span className="sh-live" data-mode={mode}>{mode === 'live' ? 'Live now' : <><Icon name="radio" size={16} />Starting soon</>}</span>
              <b>{next.title}</b>
              <span className="sh-mut">{mode === 'live' ? `Started ${next.time}` : next.time}</span>
              <a className="wk-btn wk-btn-accent wk-btn-sm" id="sh-join" href={next.joinHref} onClick={stop(next.joinHref)}><Icon name="video" /><RollLabel>{`Join on ${next.where}`}</RollLabel></a>
            </>))}
          </div>
          <nav className="wk-sr" aria-label="Breadcrumb"><a href={shell.homeHref} onClick={stop(shell.homeHref)}>Home</a>{' / '}<span aria-current="page" id="sh-here">{shell.here}</span></nav>
          {/* The account menu's trigger: the learner's initials. The menu itself is the LMS's own (not in the mockup). */}
          <button className="wk-btn wk-btn-ghost wk-btn-sm sh-acct" type="button" aria-label={shell.account.aria} aria-haspopup="menu" aria-expanded={shell.account.open ? 'true' : 'false'} onClick={shell.account.onClick}>{shell.account.initials}<Icon name="chev" /></button>
        </header>
        <main id="main">{children}</main>
      </div>
    </div>
  );
}
