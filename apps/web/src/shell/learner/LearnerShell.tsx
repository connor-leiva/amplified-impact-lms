import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, Ref } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { fmt } from '@ai/core';
import type { Learner } from '@ai/core';
import { learnerOf, withLiveState } from '@ai/core/learner';

import '../../styles/r2.css';
import '../../styles/learner-v2.css';
// D-214: the brand's motion tokens and rise (Amplified Impact Motion v1), for every page in the learner frame,
// not only the step page: the pages' rises, presses and transitions read them.
import '../../components/motion/ai-motion.css';
import { Icon } from '../../components/Icon';
import { calLinks } from '../../components/calendar-links';
import { Menu } from '../../components/r2/Menu';
import type { MenuEntry, MenuGroup } from '../../components/r2/Menu';
import { useDialogA11y } from '../../components/primitives/Modal';
import { ToasterProvider, useToaster } from '../../components/primitives/Toaster';
import { useDb, useNow, useViewer } from '../../data/hooks';
import { useJoin } from '../../data/join';
import { EXIT_PREVIEW_TO, PREVIEW_LABEL } from '../../data/preview';
import { SIGN_OUT_FAILED, signOut as endSession } from '../../data/session';
import { ConfettiProvider } from '../Confetti';
import { DemoControls } from '../DemoControls';
import { useAppReady, useViewportWidth } from '../hooks';
import { AcademyLogo } from '../admin/Wordmark';
import { useCourse } from '../../routes/learn/data';
import type { LearnContext } from '../../routes/learn/data';
import { saveIcs } from '../../routes/learn/ics';
import { HUE, LABELS, barVM, hasTeamHub, navVM, sideVM, weekOfPath, weekRows } from '../../routes/learn/learn.vm';
import type { BarVM, NavVM, SideVM } from '../../routes/learn/learn.vm';
import { hireNav, hireOfPath, hireRows } from '../../routes/learn/Hire.vm';
import { learnAccount, learnHome, learnSchedule, learnTeam } from '../../routes/learn/routes';
import { useSkills } from '../../routes/learn/skills-data';
import { TeamPlanWindow } from '../../routes/learn/TeamPlan';
import { planItemOf, teamGateFor, teamPlanVM, withoutPlan } from '../../routes/learn/TeamPlan.vm';
import { TeamPlanProvider } from '../../routes/learn/teamPlanContext';
import type { PlanItem } from '../../routes/learn/teamPlanContext';
import { v6StepAt } from '../../routes/learn/step-page/v6';
import { v3FrameAt } from '../../routes/learn/lms-v3/v3';
import { v3PageAt } from '../../routes/learn/lms-v3/pages';
import { currentOf, programNameOf } from '../../routes/learn/lms-v3/shell.vm';
import { TourProvider, useLmsTour } from '../../routes/learn/tour/Tour';
import { isNoCourseLearner } from '../../routes/learn/audience';
import s from './LearnerShell.module.css';
import { PHONE, sidebarVM, themeVM } from './shell.vm';
import { useFrameLight, useLearnerPrefs } from './useLearnerPrefs';

// The learner shell of the learner portal v2 (D-177), the signed-off learner mockup's frame
// (docs/design/learner-v2): the 244px sidebar (Home, Schedule, Skill library, Resource vault, the AI
// employees with their icon and status, Get help; a 64px rail from 768 to 1199px), the 52px bar that says
// one thing (the session live now, else the next live build, then the account), and on a phone a 56px
// bar, a next-session strip and the sidebar as a drawer. No admin chrome.
//
// Built alongside the current learner portal (`../AppShell.tsx`, unchanged), behind the off-by-default
// flag (`routes/learn/flag.ts`). With the flag on it is the portal of every learner whose plan opens the
// course (D-182, `routes/learn/audience.ts`); everyone else keeps the first portal. It reads
// `GET /api/course`, the snapshot and the viewer, and hands them to each screen through the outlet's
// context.
//
// D-182 also gave it the first portal's pieces with no screen in the mockup, so that nothing a learner
// could do there is lost: the Resource vault for every learner (the first portal kept it for a plan
// without the course, D-119), the account menu's Team Hub for a Team tier learner (the one place an owner
// invites a teammate), a staff member's "Preview as learner" line (D-138), and in the fixture build only,
// the demo controls (CLAUDE.md; never in http mode, where `DemoControls` draws nothing).
//
// REQUIRED LANDMARKS (CLAUDE.md): `aside[aria-label="Primary"]` (on a phone it is in the drawer, hidden
// until opened), a `header` holding `nav[aria-label="Breadcrumb"]` (visually hidden: the mockup's bar
// draws none), `main`, `[role="dialog"]` and `data-drawer="open"` on the open drawer, `data-brand-slot` on
// the academy lockup (D-256), and `body[data-app-ready="true"]` once the snapshot, the viewer and the course are in.
//
// D-185 restores two of the current portal's controls: the account menu's Theme (Light, Dark) and, on a
// desktop (1200px and wider), Collapse sidebar / Expand sidebar, the collapsed form being the rail. Both
// are remembered per person (`useLearnerPrefs.ts`). The laptop's rail (768 to 1199px) stays automatic.

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
  /** D-184: Team Hub (Team tier) and the cohort line. */
  side: SideVM;
  drawer?: boolean;
  onClose?: () => void;
  closeRef?: Ref<HTMLButtonElement>;
  go: () => void;
  /** D-185: drawn as the 64px rail (a laptop, or a desktop the person collapsed). */
  rail?: boolean;
  /** D-185: the desktop's Collapse sidebar / Expand sidebar, or none. */
  toggle?: { label: string; onToggle: () => void } | null;
  /** D-185, D-256: the brand's reversed academy lockup, on the dark theme. */
  dark?: boolean;
}

function Sidebar({ nav, side, drawer = false, onClose, closeRef, go, rail = false, toggle = null, dark = false }: SidebarProps) {
  const [open, setOpen] = useState(true);
  return (
    <aside aria-label={LABELS.primary} className={s.sb} data-rail={rail ? 'true' : undefined}>
      <div className={s.top}>
        <Link className={s.wmw} to={nav.home.href} aria-label={LABELS.homeLink} onClick={go}>
          <AcademyLogo short={rail} reversed={dark} />
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
      {side.cohortLine ? <p className={s.ctx}>{side.cohortLine}</p> : null}
      <nav className={s.nav} aria-label={LABELS.learner}>
        <Link className={s.ni} to={nav.home.href} data-on={nav.home.active ? 'true' : undefined} aria-current={nav.home.active ? 'page' : undefined} title={nav.home.label} onClick={go}>
          <Icon name="lvHome" size={16} strokeWidth={1.75} />
          <span className={s.lbl}>{nav.home.label}</span>
        </Link>
        {nav.cohort ? (
          <Link className={s.ni} to={nav.schedule.href} data-on={nav.schedule.active ? 'true' : undefined} aria-current={nav.schedule.active ? 'page' : undefined} title={nav.schedule.label} onClick={go}>
            <Icon name="r2Cohorts" size={16} strokeWidth={1.75} />
            <span className={s.lbl}>{nav.schedule.label}</span>
          </Link>
        ) : null}
        <Link className={s.ni} to={nav.library.href} data-on={nav.library.active ? 'true' : undefined} aria-current={nav.library.active ? 'page' : undefined} title={nav.library.label} onClick={go}>
          <Icon name="lvGrid" size={16} strokeWidth={1.75} />
          <span className={s.lbl}>{nav.library.label}</span>
        </Link>
        {side.teamHub ? (
          <Link className={s.ni} to={side.teamHub.href} data-on={side.teamHub.active ? 'true' : undefined} aria-current={side.teamHub.active ? 'page' : undefined} title={side.teamHub.label} onClick={go}>
            <Icon name="r2Learners" size={16} strokeWidth={1.75} />
            <span className={s.lbl}>{side.teamHub.label}</span>
          </Link>
        ) : null}
        {nav.vault.locked ? (
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
          <Link className={s.ni} to={nav.vault.href} data-on={nav.vault.active ? 'true' : undefined} aria-current={nav.vault.active ? 'page' : undefined} title={nav.vault.label} onClick={go}>
            <Icon name="r2Vault" size={16} strokeWidth={1.75} />
            <span className={s.lbl}>{nav.vault.label}</span>
          </Link>
        )}
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
                      key={r.key}
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
                      {r.locked ? (
                        <span className={s.nl}>
                          <Icon name="lvLock" size={12} strokeWidth={1.75} label={LABELS.locked} />
                        </span>
                      ) : null}
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
        {toggle ? (
          <button type="button" className={`${s.ni} ${s.tog}`} title={toggle.label} aria-label={toggle.label} onClick={toggle.onToggle}>
            <Icon name="panel" size={16} strokeWidth={1.75} />
            <span className={s.lbl}>{toggle.label}</span>
          </button>
        ) : null}
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
        {bar.state === 'live' ? (
          <span className={s.st} aria-hidden="true">
            <i />
          </span>
        ) : (
          <span className={s.tbi}>
            <Icon name="lvLive" size={14} strokeWidth={1.75} />
          </span>
        )}
        <span className={bar.state === 'live' ? s.liveK : s.tbk}>{bar.badge}</span>
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
      {bar.ics[0] ? <BarCalLinks event={bar.ics[0]} /> : null}
    </div>
  );
}

/** D-183: Google Calendar and Outlook beside the bar's .ics, as the current portal's calendar menu offers. */
function BarCalLinks({ event }: { event: { title: string; start: number; end: number } }) {
  const links = calLinks(event);
  return (
    <>
      <a className={`${s.b} ${s.q} ${s.wideOnly}`} href={links.google} target="_blank" rel="noopener">
        {LABELS.googleCalendar}
      </a>
      <a className={`${s.b} ${s.q} ${s.wideOnly}`} href={links.outlook} target="_blank" rel="noopener">
        {LABELS.outlook}
      </a>
    </>
  );
}

function PhoneStrip({ bar }: { bar: BarVM }) {
  const join = useJoin();
  const { toast } = useToaster();
  if (bar.kind === 'none') return null;
  if (bar.kind === 'live') {
    return (
      <div className={s.tbs2} role="status">
        {bar.state === 'live' ? (
          <span className={s.st} aria-hidden="true">
            <i />
          </span>
        ) : (
          <Icon name="lvLive" size={18} strokeWidth={1.75} />
        )}
        <span className={s.el}>
          <b>{bar.badge}</b> · {bar.title}
        </span>
        <button type="button" className={`${s.b} ${s.p}`} onClick={() => void join(bar.sessionId, () => toast(`Opening Zoom · ${bar.title}`, 'info'))}>
          {bar.joinLabel}
        </button>
      </div>
    );
  }
  return (
    <Link className={s.tbs2} to={learnSchedule()}>
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

/**
 * D-257 (Q-B3): the program line of a learner without the course, their plan's name or their access group's, from
 * `GET /api/skills`. Its own component, so only that learner's frame reads it.
 */
function NoCourseProgram({ children }: { children: (programName: string | undefined) => ReactNode }) {
  const skills = useSkills();
  return <>{children(skills.kind === 'ready' ? programNameOf(skills.payload) : undefined)}</>;
}

/** D-187: the Team Plan window, mounted only while it is open, so the library is asked only then. */
function TeamPlan({ item, me, onClose }: { item: PlanItem; me: Learner | null; onClose: () => void }) {
  const db = useDb();
  const skills = useSkills();
  const vm = teamPlanVM(item, db, me, skills);
  return vm ? <TeamPlanWindow vm={vm} onClose={onClose} /> : null;
}

// D-226: the v3 shell (IMPLEMENTATION-SPEC.md Phase 3), loaded only for a learner it draws for (`v3On`: the build
// flag, or the seeded test learner), so its global stylesheets never reach today's shell.
const V3Frame = lazy(() => import('../../routes/learn/lms-v3/V3Frame'));

/** The hidden breadcrumb's words for a page that isn't a week or an AI Employee (v3: the shell always draws one). */
const HERE: Record<string, string> = {
  home: LABELS.home,
  schedule: LABELS.schedule,
  community: 'Community',
  library: LABELS.library,
  team: LABELS.teamHub,
  vault: LABELS.vault,
};

function Frame() {
  const db = useDb();
  const viewer = useViewer();
  const loaded = useCourse();
  // D-183: every 15 seconds, as the current portal's Sessions page ticks, so Join appears 15 minutes before
  // a session starts without a reload.
  const now = useNow(15_000);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToaster();
  const vw = useViewportWidth();
  const phone = vw < PHONE;
  // D-185: this person's theme and desktop sidebar.
  const prefs = useLearnerPrefs(viewer);
  const dark = prefs.theme === 'dark';
  const form = sidebarVM(vw, prefs.sidebar);
  const theme = themeVM(prefs.theme);

  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const preview = viewer.preview ?? null;
  const staff = viewer.actor.kind === 'staff' ? (db.staff.find((x) => viewer.actor.kind === 'staff' && x.id === viewer.actor.staffId) ?? null) : null;
  const name = me?.name ?? staff?.name ?? '';
  // D-183: the course's sessions carry the state the Console sets (Go Live, End Session, the replay), read
  // off the snapshot, which refetches whenever the server says something changed (`/api/events`), as the
  // current portal's does. Every screen gets the sessions this way, through the outlet's context.
  const course = useMemo(
    () => (loaded.kind === 'ready' ? { ...loaded, payload: { ...loaded.payload, sessions: withLiveState(loaded.payload.sessions, db) } } : loaded),
    [loaded, db],
  );
  const payload = course.kind === 'ready' ? course.payload : null;
  const rows = useMemo(() => (payload ? weekRows(payload, db, me) : []), [payload, db, me]);
  // D-186: the non-course AI Employees, after the course's weeks in the AI employees group.
  const hires = useMemo(() => hireRows(db, me, now), [db, me, now]);
  const nav = navVM(payload, rows, location.pathname, hires.map((h) => hireNav(h, location.pathname)));
  const bar = barVM(payload, now);
  const side = sideVM(db, me, payload, location.pathname, now);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const wasOpen = useRef(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  // The drawer is a modal dialog (D-181): Escape closes it and Tab stays inside it, through the dialogs'
  // shared hook; the page behind it is inert while it is open. Focus goes to Close and, on closing,
  // back to the menu button that opened it.
  useDialogA11y(drawerRef, drawerOpen, closeDrawer);
  useEffect(() => {
    if (drawerOpen) closeRef.current?.focus();
    else if (wasOpen.current) menuRef.current?.focus();
    wasOpen.current = drawerOpen;
  }, [drawerOpen]);
  useEffect(() => {
    if (!phone) setDrawerOpen(false);
  }, [phone]);

  // A new page starts at the top, as the mockup's links do.
  useEffect(() => {
    const el = document.scrollingElement;
    if (el && el.scrollTop > 0) window.scrollTo(0, 0);
  }, [location.pathname]);

  useAppReady();
  // D-257: a learner without the course (in the v3 frame once v3 is on) keeps today's rule for the Team Hub: no Team
  // Plan window from its address (`/learn/team` sends them to their Skill Library, as `/team` did).
  const noCourse = isNoCourseLearner(viewer, db);
  const gate = noCourse ? null : teamGateFor(location.pathname, db, me);
  // Which frame draws this page: the v6 step page's own (D-210), the v3 shell (D-226), or today's.
  const v6Step = !gate && v6StepAt(location.pathname, payload, rows, viewer.actor, me, now);
  const inV3 = !gate && !v6Step && v3FrameAt(location.pathname, viewer, me);
  // D-260 (Connor, Q-C3): inside the v3 frame everything draws light, whatever this person's theme, until the
  // dark-mode pass: the root (`useFrameLight`), today's pages, the account menu and the windows the frame opens.
  useFrameLight(inV3);
  const shown: 'light' | 'dark' = inV3 ? 'light' : prefs.theme;
  // D-252: "How the LMS Works", once per page load for a learner in the course who hasn't seen it, and Week 0's card.
  const tour = useLmsTour({ viewer, me, course, theme: shown });

  const signOut = useCallback(() => {
    void endSession().then((ok) => {
      if (!ok) toast(SIGN_OUT_FAILED, 'warn');
    });
  }, [toast]);

  const onWeek = weekOfPath(location.pathname);
  const onHire = hireOfPath(location.pathname);
  const hire = onHire === null ? undefined : hires.find((h) => h.id === onHire);
  const here = onWeek !== null ? rows.find((r) => r.week === onWeek) : hire ? { title: hire.name } : null;
  const ctx: LearnContext = { course, db, viewer, now };

  // D-187: the Team Plan window. A screen opens it (`useTeamPlan`), or the address does (`?plan=team`, where
  // today's `/team-tier` lands); a page that comes with the Team Plan sends an Agent Plan learner to it
  // instead of drawing (`teamGateFor`). It asks the library for the builder's words and the learner's access
  // groups only once it opens.
  const [clicked, setClicked] = useState<PlanItem | null>(null);
  const addressed = planItemOf(location.search);
  const item = clicked ?? addressed;
  const closePlan = useCallback(() => {
    setClicked(null);
    if (addressed) navigate({ pathname: location.pathname, search: withoutPlan(location.search), hash: location.hash }, { replace: true });
  }, [addressed, location.hash, location.pathname, location.search, navigate]);
  const openPlan = useCallback((x: PlanItem) => {
    setDrawerOpen(false);
    setClicked(x);
  }, []);

  const accountItems: (MenuEntry | MenuGroup)[] = [
    { label: LABELS.accountPage, onSelect: () => navigate(learnAccount()) },
    ...(hasTeamHub(db, me) ? [{ label: LABELS.teamHub, onSelect: () => navigate(learnTeam()) }] : []),
    'separator',
    {
      group: theme.label,
      items: theme.choices.map((c) => ({ label: c.label, icon: c.icon, checked: c.checked, onSelect: () => prefs.set({ theme: c.value }) })),
    },
    'separator',
    { label: LABELS.signOut, onSelect: signOut },
  ];

  // D-210: a step that draws the v6 step page has no app chrome (no sidebar, top bar or drawer). The step
  // route asks the same rule (`v6StepAt`), so the two always agree; with VITE_STEP_PAGE_V6 off it is never true.
  if (v6Step) {
    // The frame stays (its tokens and the person's theme, D-185); only the sidebar, top bar and drawer go.
    return (
      <div data-r2-scope="" data-learner-v2="" data-lv-theme={prefs.theme}>
        <TeamPlanProvider value={openPlan}>
          <TourProvider value={tour.api}>
            <Outlet context={ctx} />
          </TourProvider>
        </TeamPlanProvider>
        {item ? <TeamPlan item={item} me={me} onClose={closePlan} /> : null}
        {tour.modal}
      </div>
    );
  }

  // D-226: the v3 shell, for a learner it draws for. A staff member's preview keeps today's shell: its "Previewing as"
  // line has no place in the mockup's frame (C-04), so that waits for Connor. D-231: staff open the Community in it.
  if (inV3) {
    const cur = currentOf(location.pathname);
    const frame = (programName?: string) => (
      <Suspense fallback={null}>
        <V3Frame
          input={{ nav, side, rows, sessions: payload?.sessions ?? [], me, name, now, here: here?.title ?? (cur ? (HERE[cur] ?? '') : ''), noCourse, programName }}
          pathname={location.pathname}
          collapsed={prefs.sidebar === 'rail'}
          onCollapse={(on) => prefs.set({ sidebar: on ? 'rail' : 'full' })}
          menu={accountItems}
          v3Page={v3PageAt(location.pathname, location.search, payload, rows, now)}
          theme={shown}
        >
          <TeamPlanProvider value={openPlan}>
            <TourProvider value={tour.api}>
              <Outlet context={ctx} />
            </TourProvider>
          </TeamPlanProvider>
        </V3Frame>
      </Suspense>
    );
    return (
      <>
        {/* D-257 (Q-B3): a learner without the course's program line reads their plans (the read LearnGate made). */}
        {noCourse ? <NoCourseProgram>{frame}</NoCourseProgram> : frame()}
        {item ? (
          <div data-r2-scope="" data-learner-v2="" data-lv-theme={shown}>
            <TeamPlan item={item} me={me} onClose={closePlan} />
          </div>
        ) : null}
        {tour.modal}
      </>
    );
  }

  return (
    <div className={s.frame} data-r2-scope="" data-learner-v2="" data-lv-theme={prefs.theme}>
      <div className={s.shell} inert={phone && drawerOpen ? true : undefined}>
        {phone ? null : (
          <Sidebar
            nav={nav}
            side={side}
            go={() => undefined}
            rail={form.form === 'rail'}
            dark={dark}
            toggle={form.toggle ? { label: form.toggle.label, onToggle: () => prefs.set({ sidebar: form.toggle!.next }) } : null}
          />
        )}
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
                <AcademyLogo reversed={dark} />
              </Link>
            </div>
            <NextSession bar={bar} now={now} />
            <span className={`${s.spacer} ${s.dtOnly}`} />
            {phone ? null : <DemoControls vw={vw} />}
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
              items={accountItems}
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
          {preview ? (
            // A staff member's "Preview as learner" tab (D-138), as the first portal's shell said it. A plain
            // link, not the router: the preview is read at boot, so leaving it is a fresh load of the Console.
            <div className={s.preview} role="status">
              <span>Previewing as {PREVIEW_LABEL[preview]}.</span>
              <a className={s.previewExit} href={EXIT_PREVIEW_TO}>
                Exit Preview
              </a>
            </div>
          ) : null}
          <main className={s.main} id="main">
            <TeamPlanProvider value={openPlan}>
              <TourProvider value={tour.api}>{gate ? <Navigate to={gate} replace /> : <Outlet context={ctx} />}</TourProvider>
            </TeamPlanProvider>
          </main>
        </div>
      </div>

      {phone ? (
        <>
          {drawerOpen ? <div className={s.scrim} onClick={closeDrawer} /> : null}
          <div ref={drawerRef} tabIndex={-1} className={s.drw} hidden={!drawerOpen} role="dialog" aria-modal="true" aria-label={LABELS.menu} data-drawer={drawerOpen ? 'open' : undefined}>
            <Sidebar nav={nav} side={side} drawer onClose={closeDrawer} closeRef={closeRef} go={closeDrawer} dark={dark} />
          </div>
        </>
      ) : null}

      {item ? <TeamPlan item={item} me={me} onClose={closePlan} /> : null}
      {tour.modal}
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
