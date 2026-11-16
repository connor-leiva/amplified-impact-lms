import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { avatarColor, fmt, nextSession } from '@ai/core';

import '../../styles/r2.css';
import { Icon } from '../../components/Icon';
import { Status } from '../../components/r2/Status';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useNow, useViewer } from '../../data/hooks';
import { fixtureConsoleRole, masqueradeActive } from '../../data/console';
import { PARITY_POSSIBLE, parityR2, shellDataFrom, shellDataFromParity } from '../../data/admin-shell';
import type { ParityR2 } from '../../data/parity-r2';
import { SIGN_OUT_FAILED, signOut as endSession } from '../../data/session';
import { loadNavGroups, loadPrefs, saveNavGroups, type Prefs } from '../../lib/prefs';
import { DemoControls } from '../DemoControls';
import { ProfileMenu } from '../ProfileMenu';
import { ShellProvider } from '../ShellContext';
import { useAppReady, useViewportWidth } from '../hooks';
import { adminNav, crumbTrail, groupHub, hubPages, toggleGroup, type R2Group } from './adminNav';
import { AdminChromeProvider } from './chrome';
import { Palette } from './Palette';
import { Sidebar, type SidebarMode } from './Sidebar';
import { Wordmark } from './Wordmark';
import s from './AdminShell.module.css';

// The admin AppShell of the Admin redesign R2 (D-160 R2-1b, BUILD-SPEC § 4), the mockup's frame: the
// sidebar (244px, a 64px rail from 768 to 1199px, a 300px drawer on a phone), the 52px top bar with
// `Admin / {group} / {page}`, the ⌘K trigger and the environment dot, and `main`. The learner shell
// (`../AppShell.tsx`) is unchanged; AppShell hands staff to this one.
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
// (`masqueradeActive`, the Masquerade PR's seam). A record's page names itself in the breadcrumb, and
// the R2 toast is the shell's (`chrome.ts`).

const ADMIN_ROOT = '/admin';

type Band = 'phone' | 'laptop' | 'desktop';
const bandOf = (vw: number): Band => (vw < 768 ? 'phone' : vw < 1200 ? 'laptop' : 'desktop');

/** Preferences, re-read on the `ai-prefs` event so a group's fold applies at once. */
function usePrefs(): Prefs {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  useEffect(() => {
    const onPrefs = () => setPrefs(loadPrefs());
    window.addEventListener('ai-prefs', onPrefs);
    return () => window.removeEventListener('ai-prefs', onPrefs);
  }, []);
  return prefs;
}

export function AdminShell() {
  const db = useDb();
  const viewer = useViewer();
  const now = useNow();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToaster();
  const prefs = usePrefs();
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

  const data = useMemo(
    () => (parity ? shellDataFromParity(parity) : shellDataFrom(db, staffId, role)),
    [db, parity, role, staffId],
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

  // ---- groups: open or closed, per staff member, in this browser -----------------------------------
  const open = useMemo(() => (staffId ? loadNavGroups(staffId, prefs) : {}), [prefs, staffId]);
  const groups = useMemo(
    () =>
      adminNav({
        pathname: path,
        role: parity ? data.viewer.role : role,
        fullNav: data.fullNav,
        counts: data.counts,
        open,
      }),
    [data, open, parity, path, role],
  );
  const onToggleGroup = useCallback(
    (group: R2Group, active: boolean) => {
      if (staffId) saveNavGroups(staffId, toggleGroup(group, active, loadNavGroups(staffId)));
    },
    [staffId],
  );

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
  const chrome = useMemo(() => ({ openPalette, setRecord, toast: r2Toast }), [openPalette, r2Toast]);

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

  const trail = crumbTrail(path);
  const hub = trail && !trail.hub ? groupHub(trail.group, parity ? data.viewer.role : role, data.fullNav) : null;

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
    groups,
    go,
    onToggleGroup,
    onProfile: () => setProfileOpen((v) => !v),
    profileOpen,
    onToggleRail: () => setRailChoice({ band, rail: !rail }),
  };

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className={band === 'phone' ? s.srOnly : s.crumbs}>
      <span>Admin</span>
      {trail?.hub ? (
        <>
          <span aria-hidden="true">/</span>
          <b className={s.here} aria-current="page">
            {trail.group}
          </b>
        </>
      ) : trail ? (
        <>
          <span aria-hidden="true">/</span>
          {/* D-169: a group with a hub (Build) links its crumb there; drawn as the crumb's own text. */}
          {hub ? (
            <Link to={hub} className={s.crumbLink}>
              {trail.group}
            </Link>
          ) : (
            <span>{trail.group}</span>
          )}
          <span aria-hidden="true">/</span>
          {trail.parent ? (
            <>
              <Link to={trail.parent} className={s.crumbLink}>
                {trail.page}
              </Link>
              {record ? (
                <>
                  <span aria-hidden="true">/</span>
                  <b className={s.record} aria-current="page">
                    {record}
                  </b>
                </>
              ) : null}
            </>
          ) : (
            <b className={s.here} aria-current="page">
              {trail.page}
            </b>
          )}
        </>
      ) : null}
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
                  <Wordmark />
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
            pages={[...groups.flatMap((g) => g.rows.map((r) => ({ id: r.id, label: r.label, icon: r.icon, to: r.to }))), ...hubPages(parity ? data.viewer.role : role, data.fullNav)]}
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
