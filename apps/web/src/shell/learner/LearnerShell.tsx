import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Ref } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { fmt } from '@ai/core';
import { learnerOf } from '@ai/core/learner';

import '../../styles/r2.css';
import '../../styles/learner-v2.css';
import { Icon } from '../../components/Icon';
import { Menu } from '../../components/r2/Menu';
import { ToasterProvider, useToaster } from '../../components/primitives/Toaster';
import { useDb, useNow, useViewer } from '../../data/hooks';
import { useJoin } from '../../data/join';
import { SIGN_OUT_FAILED, signOut as endSession } from '../../data/session';
import { ConfettiProvider } from '../Confetti';
import { useAppReady, useViewportWidth } from '../hooks';
import { Wordmark } from '../admin/Wordmark';
import { useCourse } from '../../routes/learn/data';
import type { LearnContext } from '../../routes/learn/data';
import { saveIcs } from '../../routes/learn/ics';
import { HUE, LABELS, barVM, navVM, weekOfPath, weekRows } from '../../routes/learn/learn.vm';
import type { BarVM, NavVM } from '../../routes/learn/learn.vm';
import { learnAccount, learnHome } from '../../routes/learn/routes';
import s from './LearnerShell.module.css';

// The learner shell of the learner portal v2 (D-177), the signed-off learner mockup's frame
// (docs/design/learner-v2): the 244px sidebar (Home, Schedule, Skill library, Resource vault, the AI
// employees with their icon and status, Get help; a 64px rail from 768 to 1199px), the 52px bar that says
// one thing (the session live now, else the next live build, then the account), and on a phone a 56px
// bar, a next-session strip and the sidebar as a drawer. No admin chrome.
//
// Built alongside the current learner portal (`../AppShell.tsx`, unchanged), behind the off-by-default
// flag (`routes/learn/flag.ts`). It reads `GET /api/course`, the snapshot and the viewer, and hands them
// to each screen through the outlet's context.
//
// REQUIRED LANDMARKS (CLAUDE.md): `aside[aria-label="Primary"]` (on a phone it is in the drawer, hidden
// until opened), a `header` holding `nav[aria-label="Breadcrumb"]` (visually hidden: the mockup's bar
// draws none), `main`, `[role="dialog"]` and `data-drawer="open"` on the open drawer, `data-brand-slot` on
// the wordmark, and `body[data-app-ready="true"]` once the snapshot, the viewer and the course are in.

const PHONE = 768;

function Ring({ ratio }: { ratio: number }) {
  const c = 2 * Math.PI * 6;
  return (
    <svg className={s.ring} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" className={s.ringTrack} />
      <circle cx="8" cy="8" r="6" className={s.ringValue} style={{ strokeDasharray: `${(c * Math.min(1, Math.max(0, ratio))).toFixed(2)}, ${c.toFixed(1)}` }} />
    </svg>
  );
}

interface SidebarProps {
  nav: NavVM;
  drawer?: boolean;
  onClose?: () => void;
  closeRef?: Ref<HTMLButtonElement>;
  go: () => void;
}

function Sidebar({ nav, drawer = false, onClose, closeRef, go }: SidebarProps) {
  const [open, setOpen] = useState(true);
  return (
    <aside aria-label={LABELS.primary} className={s.sb}>
      <div className={s.top}>
        <Link className={s.wmw} to={nav.home.href} aria-label={LABELS.homeLink} onClick={go}>
          <Wordmark />
        </Link>
        {drawer ? (
          <>
            <span className={s.spacer} />
            <button ref={closeRef} type="button" className={s.ib} aria-label={LABELS.closeMenu} onClick={onClose}>
              <Icon name="r2X" size={20} strokeWidth={1.75} />
            </button>
          </>
        ) : null}
      </div>
      <nav className={s.nav} aria-label={LABELS.learner}>
        <Link className={s.ni} to={nav.home.href} data-on={nav.home.active ? 'true' : undefined} aria-current={nav.home.active ? 'page' : undefined} title={nav.home.label} onClick={go}>
          <Icon name="lvHome" size={16} strokeWidth={1.75} />
          <span className={s.lbl}>{nav.home.label}</span>
        </Link>
        {nav.cohort ? (
          <Link className={s.ni} to={nav.schedule.href} title={nav.schedule.label} onClick={go}>
            <Icon name="r2Cohorts" size={16} strokeWidth={1.75} />
            <span className={s.lbl}>{nav.schedule.label}</span>
          </Link>
        ) : null}
        <Link className={s.ni} to={nav.library.href} title={nav.library.label} onClick={go}>
          <Icon name="lvGrid" size={16} strokeWidth={1.75} />
          <span className={s.lbl}>{nav.library.label}</span>
        </Link>
        {nav.cohort ? (
          nav.vault.locked ? (
            <button type="button" className={s.ni} title={nav.vault.label} aria-disabled="true" aria-describedby="lv-vault-opens">
              <Icon name="r2Vault" size={16} strokeWidth={1.75} />
              <span className={s.lbl}>{nav.vault.label}</span>
              <span className={s.nl} title={nav.vault.title ?? undefined}>
                <Icon name="lvLock" size={12} strokeWidth={1.75} label={LABELS.locked} />
              </span>
              <span id="lv-vault-opens" className={s.srOnly}>
                {nav.vault.title ?? LABELS.locked}
              </span>
            </button>
          ) : (
            <Link className={s.ni} to={nav.vault.href} title={nav.vault.label} onClick={go}>
              <Icon name="r2Vault" size={16} strokeWidth={1.75} />
              <span className={s.lbl}>{nav.vault.label}</span>
            </Link>
          )
        ) : null}
        {nav.employees ? (
          <>
            <div className={s.rsep} aria-hidden="true" />
            <div className={s.grp}>
              <button type="button" className={s.ng} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                <Icon name="r2Chev" size={12} strokeWidth={2.2} />
                <span>{nav.employees.label}</span>
                <span className={s.ngc}>{nav.employees.count}</span>
              </button>
              {open
                ? nav.employees.rows.map((r) => (
                    <Link
                      key={r.week}
                      className={`${s.ni} ${s.em}`}
                      to={r.href}
                      title={r.title}
                      data-on={r.active ? 'true' : undefined}
                      aria-current={r.active ? 'page' : undefined}
                      onClick={go}
                    >
                      <span className={s.tile} data-hue={HUE[r.tone]} aria-hidden="true">
                        <Icon name={r.icon} size={14} strokeWidth={1.9} />
                      </span>
                      <span className={s.lbl}>{r.label}</span>
                      {r.status ? (
                        <span className={s.es} data-tone={r.status.kind === 'ring' ? 'ip' : r.status.kind === 'built' ? 'ok' : r.status.kind === 'open' ? 'open' : undefined}>
                          {r.status.kind === 'ring' ? <Ring ratio={r.status.ratio} /> : null}
                          {r.status.kind === 'built' ? <Icon name="r2Check" size={12} strokeWidth={2.2} /> : null}
                          {r.status.text}
                        </span>
                      ) : null}
                    </Link>
                  ))
                : null}
            </div>
          </>
        ) : null}
      </nav>
      <div className={s.foot}>
        <a className={s.ni} href={nav.help.href} title={nav.help.label}>
          <Icon name="lvHelp" size={16} strokeWidth={1.75} />
          <span className={s.lbl}>{nav.help.label}</span>
        </a>
      </div>
    </aside>
  );
}

function NextSession({ bar, now }: { bar: BarVM; now: number }) {
  const join = useJoin();
  const { toast } = useToaster();
  if (bar.kind === 'none') return null;
  if (bar.kind === 'live') {
    return (
      <div className={`${s.tbn} ${s.dtOnly}`}>
        <span className={s.st} aria-hidden="true">
          <i />
        </span>
        <span className={s.liveK}>{LABELS.liveNow}</span>
        <b className={s.el}>{bar.title}</b>
        <span className={s.mu}>{bar.started}</span>
        <button type="button" className={`${s.b} ${s.p}`} onClick={() => void join(bar.sessionId, () => toast(`Opening Zoom · ${bar.title}`, 'info'))}>
          <Icon name="lvVideo" size={14} strokeWidth={1.75} />
          {bar.joinLabel}
        </button>
      </div>
    );
  }
  return (
    <div className={`${s.tbn} ${s.dtOnly}`}>
      <span className={s.tbi}>
        <Icon name="lvLive" size={14} strokeWidth={1.75} />
      </span>
      <span className={s.tbk}>{LABELS.nextBuild}</span>
      <b className={s.el}>{bar.title}</b>
      <span className={s.mu}>{bar.when}</span>
      <button type="button" className={`${s.b} ${s.q}`} onClick={() => saveIcs(bar.ics, now)}>
        <Icon name="lvCalAdd" size={14} strokeWidth={1.75} />
        {LABELS.addToCalendar}
      </button>
    </div>
  );
}

function PhoneStrip({ bar }: { bar: BarVM }) {
  const join = useJoin();
  const { toast } = useToaster();
  if (bar.kind === 'none') return null;
  if (bar.kind === 'live') {
    return (
      <div className={s.tbs2} role="status">
        <span className={s.st} aria-hidden="true">
          <i />
        </span>
        <span className={s.el}>
          <b>{LABELS.liveNow}</b> · {bar.title}
        </span>
        <button type="button" className={`${s.b} ${s.p}`} onClick={() => void join(bar.sessionId, () => toast(`Opening Zoom · ${bar.title}`, 'info'))}>
          {bar.joinLabel}
        </button>
      </div>
    );
  }
  return (
    <Link className={s.tbs2} to="/sessions">
      <Icon name="lvLive" size={18} strokeWidth={1.75} />
      <span className={s.el}>
        <b>{LABELS.nextBuild}</b> · {bar.when}
      </span>
      <span className={s.mu}>
        <Icon name="r2Chev" size={14} strokeWidth={1.75} />
      </span>
    </Link>
  );
}

function Frame() {
  const db = useDb();
  const viewer = useViewer();
  const course = useCourse();
  const now = useNow(30_000);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToaster();
  const vw = useViewportWidth();
  const phone = vw < PHONE;

  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const staff = viewer.actor.kind === 'staff' ? (db.staff.find((x) => viewer.actor.kind === 'staff' && x.id === viewer.actor.staffId) ?? null) : null;
  const name = me?.name ?? staff?.name ?? '';
  const payload = course.kind === 'ready' ? course.payload : null;
  const rows = useMemo(() => (payload ? weekRows(payload, db, me) : []), [payload, db, me]);
  const nav = navVM(payload, rows, location.pathname);
  const bar = barVM(payload, now);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (drawerOpen) closeRef.current?.focus();
    else if (wasOpen.current) menuRef.current?.focus();
    wasOpen.current = drawerOpen;
  }, [drawerOpen]);
  useEffect(() => {
    if (!phone) setDrawerOpen(false);
  }, [phone]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // A new page starts at the top, as the mockup's links do.
  useEffect(() => {
    const el = document.scrollingElement;
    if (el && el.scrollTop > 0) window.scrollTo(0, 0);
  }, [location.pathname]);

  useAppReady();

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const signOut = useCallback(() => {
    void endSession().then((ok) => {
      if (!ok) toast(SIGN_OUT_FAILED, 'warn');
    });
  }, [toast]);

  const onWeek = weekOfPath(location.pathname);
  const here = onWeek === null ? null : rows.find((r) => r.week === onWeek);
  const ctx: LearnContext = { course, db, viewer, now };

  return (
    <div className={s.frame} data-r2-scope="" data-learner-v2="">
      <div className={s.shell}>
        {phone ? null : <Sidebar nav={nav} go={() => undefined} />}
        <div className={s.mainc}>
          <header className={s.tb}>
            <div className={`${s.phOnly} ${s.phRow}`}>
              <button
                ref={menuRef}
                type="button"
                className={s.ib}
                aria-label={LABELS.openMenu}
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              >
                <Icon name="r2Menu" size={22} strokeWidth={1.75} />
              </button>
              <Link className={s.wmw} to={learnHome()} aria-label={LABELS.homeLink}>
                <Wordmark />
              </Link>
            </div>
            <NextSession bar={bar} now={now} />
            <span className={`${s.spacer} ${s.dtOnly}`} />
            <nav aria-label={LABELS.breadcrumb} className={s.srOnly}>
              <Link to={learnHome()}>{LABELS.home}</Link>
              {here ? (
                <>
                  {' / '}
                  <span aria-current="page">{here.title}</span>
                </>
              ) : null}
            </nav>
            <Menu
              label={LABELS.account}
              items={[
                { label: LABELS.accountPage, onSelect: () => navigate(learnAccount()) },
                'separator',
                { label: LABELS.signOut, onSelect: signOut },
              ]}
              trigger={(t) => (
                <button type="button" className={s.avb} aria-label={LABELS.account} onClick={t.toggle} {...t.props}>
                  <span className={s.av}>{fmt.initials(name)}</span>
                  <span className={s.chv}>
                    <Icon name="r2Chevd" size={14} strokeWidth={1.75} />
                  </span>
                </button>
              )}
            />
          </header>
          {phone ? <PhoneStrip bar={bar} /> : null}
          <main className={s.main} id="main">
            <Outlet context={ctx} />
          </main>
        </div>
      </div>

      {phone ? (
        <>
          {drawerOpen ? <div className={s.scrim} onClick={closeDrawer} /> : null}
          <div className={s.drw} hidden={!drawerOpen} role="dialog" aria-modal="true" aria-label={LABELS.menu} data-drawer={drawerOpen ? 'open' : undefined}>
            <Sidebar nav={nav} drawer onClose={closeDrawer} closeRef={closeRef} go={closeDrawer} />
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * The route module React Router lazy-loads. The toast and confetti viewports wrap the frame, because
 * `useMutate()` (Mark step done) resolves both from context.
 */
export function Component() {
  return (
    <ToasterProvider>
      <ConfettiProvider>
        <Frame />
      </ConfettiProvider>
    </ToasterProvider>
  );
}

export default Component;
