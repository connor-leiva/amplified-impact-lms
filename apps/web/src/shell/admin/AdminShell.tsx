import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { avatarColor, can, consoleCan, fmt, nextSession } from '@ai/core';

import '../../styles/r2.css';
// D-239: the sidebar's travel reads the brand's motion tokens (--aim-dur-*, --aim-ease*), defined on :root here.
import '../../components/motion/ai-motion.css';
import { Icon } from '../../components/Icon';
import { Status } from '../../components/r2/Status';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useNow, useViewer } from '../../data/hooks';
import { repo } from '../../data/boot';
import { fixtureConsoleRole } from '../../data/console';
import { masqueradeActive } from '../../data/masquerade';
import { PARITY_POSSIBLE, parityR2, shellDataFrom, shellDataFromParity } from '../../data/admin-shell';
import type { ParityR2 } from '../../data/parity-r2';
import { SIGN_OUT_FAILED, signOut as endSession } from '../../data/session';
import { DemoControls } from '../DemoControls';
import { ProfileMenu } from '../ProfileMenu';
import { ShellProvider } from '../ShellContext';
import { useAppReady, useViewportWidth } from '../hooks';
import { adminNav, crumbsOf, navPages, placeOf, type SystemGroup } from './adminNav';
import { AdminChromeProvider } from './chrome';
import type { AdminCohort } from './chrome';
import { afterPick, cohortChoices, defaultCohortId } from './cohorts';
import { cohortLabel } from '../../data/admin-shell';
import { Palette } from './Palette';
import { Sidebar, type SidebarMode } from './Sidebar';
import { AcademyLogo } from './Wordmark';
import { useFailedPayments } from './useFailedPayments';
import { useOpenIncidents } from './useOpenIncidents';
import { useWaitingThreads } from './useWaitingThreads';
import s from './AdminShell.module.css';

// The admin AppShell of the Admin redesign R2 (D-160 R2-1b, BUILD-SPEC § 4), the mockup's frame: the
// sidebar (244px, a 64px rail from 768 to 1199px, a 300px drawer on a phone), the 52px top bar with
// the breadcrumb, the ⌘K trigger and the environment dot, and `main`. The learner shell
// (`../AppShell.tsx`) is unchanged; AppShell hands staff to this one.
//
// D-253 (R-5 Phase 1): the breadcrumb is `Admin / Cohort / Schedule` on one of the four pages (a record adds its
// name), `Admin / Operations / Audit Log` on a system page. The cohort the admin is on is the address's on a cohort's
// page; elsewhere the one looked at last in this tab, else the default (`cohorts.ts`). It is not stored.
//
// REQUIRED LANDMARKS (CLAUDE.md): `aside[aria-label="Primary"]` (on a phone it is in the drawer,
// hidden until opened), a `header` holding `nav[aria-label="Breadcrumb"]` (visually hidden on a phone,
// whose bar the mockup draws without one), `main`, `[role="dialog"]` and `data-drawer="open"` on the
// open drawer, `data-brand-slot` on the wordmark, and `body[data-app-ready="true"]`.
//
// `data-r2-shell` on the frame scopes the R2 tokens (styles/r2.css), and is the element the
// `parity:admin-r2` harness captures, as the mockup harness captures `.ax`.
//
// THE ⌘K PALETTE (D-160 R2-1c, spec § 7.5): the top bar's "Search or jump to…", the phone's Search,
// the 404's "Search the admin" and ⌘K / Ctrl+K open it, unless a masquerade session is running
// (`masqueradeActive`, D-162 3b's store). A record's page names itself in the breadcrumb, and
// the R2 toast is the shell's (`chrome.ts`).

const ADMIN_ROOT = '/admin';

type Band = 'phone' | 'laptop' | 'desktop';
const bandOf = (vw: number): Band => (vw < 768 ? 'phone' : vw < 1200 ? 'laptop' : 'desktop');

export function AdminShell() {
  const db = useDb();
  const viewer = useViewer();
  const now = useNow();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToaster();
  const vw = useViewportWidth();

  const path = location.pathname;
  const staffId = viewer.actor.kind === 'staff' ? viewer.actor.staffId : null;
  const person = db.staff.find((x) => x.id === staffId) ?? db.staff[0] ?? null;

  // ---- the R2 parity fixture (fixture build, `?parity=r2` only) -----------------------------------
  const [parity, setParity] = useState<ParityR2 | null | undefined>(PARITY_POSSIBLE ? undefined : null);
  useEffect(() => {
    let alive = true;
    void parityR2().then((p) => {
      if (alive) setParity(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  // The staff role the Console rows are filtered by (D-157): the viewer's own, or the fixture build's
  // preview of another (`?console-role=`). The http build has no preview.
  const staffRole = db.staff.find((x) => x.id === staffId)?.role ?? null;
  const [previewRole, setPreviewRole] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void fixtureConsoleRole().then((r) => {
      if (alive) setPreviewRole(r);
    });
    return () => {
      alive = false;
    };
  }, []);
  const role = previewRole ?? staffRole;

  // ---- the cohort the admin is on (D-253) ----------------------------------------------------------------------------
  const place = placeOf(path);
  const addressCohort = place?.cohortId && db.cohorts.some((c) => c.id === place.cohortId) ? place.cohortId : null;
  const [lastCohort, setLastCohort] = useState<string | null>(null);
  // D-255 (spec § 3): the cohort a staff member looked at last is remembered for them (`users.prefs.cohort`, through
  // `PATCH /api/me/prefs`), so a new visit starts on it. Read once; written when the address names another cohort. The
  // fixture build keeps none (its `savePrefs` writes nothing).
  const remembered = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void repo
      .prefs()
      .then((p) => {
        remembered.current = p.cohort ?? null;
        if (alive && p.cohort) setLastCohort((was) => was ?? p.cohort!);
      })
      .catch(() => {
        remembered.current = null;
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!addressCohort) return;
    setLastCohort(addressCohort);
    if (remembered.current === undefined || remembered.current === addressCohort || parity) return;
    remembered.current = addressCohort;
    void repo.savePrefs({ cohort: addressCohort }).catch(() => undefined);
  }, [addressCohort, parity]);
  const known = (id: string | null) => (id && db.cohorts.some((c) => c.id === id) ? id : null);
  const cohortId = addressCohort ?? known(lastCohort) ?? defaultCohortId(db.cohorts, now);
  const current = db.cohorts.find((c) => c.id === cohortId) ?? null;

  // D-167: the sidebar's "1 incident" from the API, once we know this is not the parity fixture.
  const openIncidents = useOpenIncidents(parity === null && consoleCan(role, 'incidents.read'), path);
  // R-5 audit (D-267): the threads waiting in the cohort the admin is on, as Cohort › Community lists them.
  const waiting = useWaitingThreads(parity === null && consoleCan(role, 'console.view'), path, cohortId);
  // R-5 Phase 8 (D-269): Revenue's "N failed", from what Billing holds in memory.
  const failed = useFailedPayments(parity === null && consoleCan(role, 'billing.read'), path);
  const data = useMemo(
    () => (parity ? shellDataFromParity(parity) : shellDataFrom(db, staffId, role, openIncidents, waiting, failed)),
    [db, failed, openIncidents, parity, role, staffId, waiting],
  );

  // ---- the sidebar's form --------------------------------------------------------------------------
  const band = bandOf(vw);
  // The rail toggle is remembered only while the window stays in the same band, as the mockup resets
  // it with the width: a laptop starts on the rail, a desktop expanded.
  const [railChoice, setRailChoice] = useState<{ band: Band; rail: boolean } | null>(null);
  const rail = band !== 'phone' && (railChoice?.band === band ? railChoice.rail : band === 'laptop');
  const mode: SidebarMode = band === 'phone' ? 'drawer' : rail ? 'rail' : 'full';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [record, setRecord] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // ---- groups: one open (D-239) ----------------------------------------------------------------------
  // The group opened or shut by hand, for the visit it was clicked on (`location.key`: each navigation has its own,
  // even back to the same address): going to any page resets it, and that page's group is the open one. View state
  // for the session: nothing is stored, and what an older build stored is left where it is, unread.
  const visit = location.key;
  const [peeked, setPeeked] = useState<{ visit: string; group: SystemGroup | null } | null>(null);
  const peek = peeked && peeked.visit === visit ? peeked.group : undefined;
  const navRole = parity ? data.viewer.role : role;


  const groups = useMemo(
    () =>
      adminNav({
        pathname: path,
        role: navRole,
        fullNav: data.fullNav,
        counts: data.counts,
        cohortId: cohortId ?? '',
        cohortDraft: current?.status === 'draft',
        peek,
        groups: db.groups ?? [],
      }),
    [cohortId, current?.status, data, navRole, path, peek, db.groups],
  );
  const onPeek = useCallback((group: SystemGroup | null) => setPeeked({ visit, group }), [visit]);

  // ---- navigating ----------------------------------------------------------------------------------
  const go = useCallback(
    (to: string) => {
      setDrawerOpen(false);
      setProfileOpen(false);
      navigate(to);
      const el = mainRef.current;
      if (el) el.scrollTop = 0;
    },
    [navigate],
  );

  // Staff live under /admin (SCREENS § 2, phase 04 § 4.1).
  const isAdminPath = path === ADMIN_ROOT || path.startsWith(`${ADMIN_ROOT}/`);
  useEffect(() => {
    if (!isAdminPath) navigate(ADMIN_ROOT, { replace: true });
  }, [isAdminPath, navigate]);

  useAppReady(parity !== undefined);

  const openPalette = useCallback(() => {
    if (masqueradeActive()) return;
    setDrawerOpen(false);
    setProfileOpen(false);
    setPaletteOpen(true);
  }, []);
  const r2Toast = useCallback((m: string) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200);
  }, []);
  const pickCohort = useCallback(
    (id: string) => {
      setLastCohort(id);
      const to = afterPick(path, id);
      if (to) go(to);
    },
    [go, path],
  );
  // D-255: "New cohort…" for a role with the `cohorts` permission (the Cohorts row's), as New cohort's page checks.
  const mayCreate = can(db, viewer.actor, 'cohorts');
  const cohort = useMemo<AdminCohort>(
    () => ({
      id: cohortId,
      label: current ? cohortLabel(current) : '',
      choices: cohortChoices(db.cohorts, cohortId),
      pick: pickCohort,
      create: mayCreate ? () => go('/admin/cohort/new') : null,
    }),
    [cohortId, current, db.cohorts, go, mayCreate, pickCohort],
  );
  const chrome = useMemo(
    () => ({ openPalette, setRecord, toast: r2Toast, role: navRole, counts: data.counts, cohort }),
    [cohort, data.counts, navRole, openPalette, r2Toast],
  );

  // Escape closes every layer the shell owns; ⌘K / Ctrl+K toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!masqueradeActive()) setPaletteOpen((o) => !o);
        return;
      }
      if (e.key !== 'Escape') return;
      setProfileOpen(false);
      setDrawerOpen(false);
      setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The drawer takes focus when it opens and gives it back to Open menu when it closes.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (drawerOpen) closeRef.current?.focus();
    else if (wasOpen.current) menuRef.current?.focus();
    wasOpen.current = drawerOpen;
  }, [drawerOpen]);
  useEffect(() => {
    if (band !== 'phone') setDrawerOpen(false);
  }, [band]);

  const crumbs = crumbsOf(place, { record, cohortId: cohortId ?? '', groups: db.groups ?? [] });

  const shellApi = useMemo(() => ({ openLocked: () => {}, sidebarMode: mode, vw }), [mode, vw]);

  const sample = nextSession(db, null, now) ?? db.sessions[2] ?? db.sessions[0];
  const signOut = useCallback(() => {
    setProfileOpen(false);
    void endSession().then((ok) => {
      if (!ok) toast(SIGN_OUT_FAILED, 'warn');
    });
  }, [toast]);

  if (parity === undefined) return null;

  const sidebarProps = {
    data,
    entries: groups,
    cohort,
    go,
    onPeek,
    onProfile: () => setProfileOpen((v) => !v),
    profileOpen,
    onToggleRail: () => setRailChoice({ band, rail: !rail }),
  };

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className={band === 'phone' ? s.srOnly : s.crumbs}>
      <span>Admin</span>
      {crumbs.map((c, i) => (
        <Fragment key={i}>
          <span aria-hidden="true">/</span>
          {c.kind === 'link' ? (
            <Link to={c.to} className={s.crumbLink}>
              {c.label}
            </Link>
          ) : c.kind === 'group' ? (
            <span>{c.label}</span>
          ) : (
            <b className={c.kind === 'record' ? s.record : s.here} aria-current="page">
              {c.label}
            </b>
          )}
        </Fragment>
      ))}
    </nav>
  );

  return (
    <ShellProvider value={shellApi}>
      <div className={s.frame} data-r2-shell="">
        <div className={s.shell}>
          {band === 'phone' ? null : <Sidebar mode={rail ? 'rail' : 'full'} {...sidebarProps} />}
          <div className={s.column}>
            <header className={s.bar}>
              {band === 'phone' ? (
                <>
                  <button
                    ref={menuRef}
                    type="button"
                    className={s.iconButton}
                    aria-label="Open menu"
                    aria-expanded={drawerOpen}
                    onClick={() => setDrawerOpen(true)}
                  >
                    <Icon name="r2Menu" size={22} strokeWidth={1.75} />
                  </button>
                  <AcademyLogo />
                  {breadcrumb}
                  <span className={s.spacer} />
                  <button type="button" className={s.iconButton} aria-label="Search" onClick={openPalette}>
                    <Icon name="r2Search" size={20} strokeWidth={1.75} />
                  </button>
                </>
              ) : (
                <>
                  {breadcrumb}
                  <span className={s.spacer} />
                  <button type="button" className={s.search} aria-haspopup="dialog" onClick={openPalette}>
                    <Icon name="r2Search" size={16} strokeWidth={1.75} />
                    <span className={s.searchLabel}>Search or jump to…</span>
                    <span className={s.kbd}>⌘K</span>
                  </button>
                  <Status tone="ok" className={s.env}>
                    {data.environment}
                  </Status>
                  <DemoControls vw={vw} />
                </>
              )}
            </header>
            <main ref={mainRef} className={s.main}>
              <AdminChromeProvider value={chrome}>
                <Outlet />
              </AdminChromeProvider>
            </main>
          </div>
        </div>

        {band === 'phone' ? (
          <Fragment>
            {drawerOpen ? <div className={s.scrim} onClick={() => setDrawerOpen(false)} /> : null}
            <div
              className={s.drawer}
              hidden={!drawerOpen}
              role="dialog"
              aria-modal="true"
              aria-label="Admin menu"
              data-drawer={drawerOpen ? 'open' : undefined}
            >
              <Sidebar mode="drawer" {...sidebarProps} onClose={() => setDrawerOpen(false)} closeRef={closeRef} />
            </div>
          </Fragment>
        ) : null}

        {paletteOpen ? (
          <Palette
            pages={navPages(navRole, data.fullNav, cohortId ?? '', db.groups ?? [])}
            cohortId={cohortId ?? ''}
            modules={db.modules.map((m) => ({ id: m.id, name: m.name, status: m.status }))}
            phone={band === 'phone'}
            go={go}
            onClose={() => setPaletteOpen(false)}
          />
        ) : null}
        {toastMsg ? (
          <div className={s.toast} role="status">
            <span className={s.toastGlyph}>
              <Icon name="r2Check" size={16} strokeWidth={1.75} />
            </span>
            {toastMsg}
          </div>
        ) : null}

        {profileOpen && person ? (
          <ProfileMenu
            me={{
              name: person.name,
              email: person.email,
              initials: fmt.initials(person.name),
              avatarColor: avatarColor(person.id),
            }}
            sampleStart={sample ? sample.start : now}
            mode={mode}
            onClose={() => setProfileOpen(false)}
            onSignOut={signOut}
          />
        ) : null}
      </div>
    </ShellProvider>
  );
}
