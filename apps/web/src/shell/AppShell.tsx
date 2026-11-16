import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { ICONS, avatarColor, canAccess, cohortLine, fmt, nextSession, sessionFor, visibleModules } from '@ai/core';
import type { Learner, Staff } from '@ai/core';

import { Icon } from '../components/Icon';
import { NavItem } from '../components/NavItem';
import { LockedEmployeePreview, type LockedItem } from '../components/LockedEmployeePreview';
import { Avatar } from '../components/primitives/Avatar';
import { ToasterProvider, useToaster } from '../components/primitives/Toaster';
import { useDb, useNow, useViewer } from '../data/hooks';
import { fixtureConsoleRole } from '../data/console';
import { EXIT_PREVIEW_TO, PREVIEW_LABEL } from '../data/preview';
import { SIGN_OUT_FAILED, signOut as endSession } from '../data/session';
import { loadPrefs, savePrefs, type Prefs } from '../lib/prefs';
import { BrandSlot } from './BrandSlot';
import { Breadcrumbs } from './Breadcrumbs';
import { ConfettiProvider } from './Confetti';
import { DemoControls } from './DemoControls';
import { ProfileMenu } from './ProfileMenu';
import { ShellProvider } from './ShellContext';
import { useAppReady, useViewportWidth } from './hooks';
import { AdminShell } from './admin/AdminShell';
import { consoleNav, noPortalRedirect, portalNav, type NavAction, type NavGroup } from './navModel';
import s from './AppShell.module.css';

// The frame every screen lives in, ported from design-reference/Amplified Impact LMS.dc.html.
// Contract: SCREENS § 2.1-2.4, phase 04 § 4.3.
//
// REQUIRED LANDMARKS (CLAUDE.md — the compliance harness selects regions with these, so changing
// one silently empties a screenshot): `aside[aria-label="Primary"]`, a `header` containing
// `nav[aria-label="Breadcrumb"]`, `main`, `data-brand-slot` on the brand placeholders, and
// `body[data-app-ready="true"]` once the first snapshot and `document.fonts.ready` have settled.
//
// The shell owns everything a screen must not: the role and tier guards, the one Locked Employee
// Preview, the toast and confetti viewports, and the viewport width. It computes no business state
// of its own — the nav comes from ./navModel, the context line from `cohortLine`, every time from
// `fmt`.

const ADMIN_ROOT = '/admin';
const EMP_PREFIX = '/employees/';
const BUILDER_PREFIX = '/admin/curriculum/';
/** The reference's fallback cohort when a viewer has none (admin). */
const DEFAULT_COHORT = 'dec26';

/** The reference's `--nav-hover` / `--nav-active`, set on the aside and consumed by NavItem. */
const NAV_VARS = {
  '--nav-hover': 'color-mix(in oklch, var(--line-default) 70%, var(--bg-sidebar))',
  '--nav-active': 'var(--action-primary-tint)',
} as React.CSSProperties;

type SidebarMode = 'full' | 'rail' | 'drawer';

/** The first path segment after a prefix, or '' — `/employees/sales` → `sales`. */
const segmentAfter = (pathname: string, prefix: string): string =>
  pathname.startsWith(prefix) ? (pathname.slice(prefix.length).split('/')[0] ?? '') : '';

/** Preferences, re-read on the `ai-prefs` event so the rail toggle and the theme apply at once. */
function usePrefs(): Prefs {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  useEffect(() => {
    const onPrefs = () => setPrefs(loadPrefs());
    window.addEventListener('ai-prefs', onPrefs);
    return () => window.removeEventListener('ai-prefs', onPrefs);
  }, []);
  return prefs;
}

function Shell() {
  const db = useDb();
  const viewer = useViewer();
  const now = useNow();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToaster();

  const vw = useViewportWidth();
  const prefs = usePrefs();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [empOpen, setEmpOpen] = useState(true);
  const [locked, setLocked] = useState<number | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  const mode: SidebarMode = vw < 768 ? 'drawer' : prefs.sidebar === 'rail' ? 'rail' : 'full';
  const expanded = mode !== 'rail';
  const collapsed = !expanded;
  const drawer = mode === 'drawer';

  // ---- who is looking -------------------------------------------------------------------------
  const actor = viewer.actor;
  // In a staff member's preview tab the actor is already the read-only learner (D-138), so the
  // guards below treat it as one and the /admin bounce does not apply. Without the flag the actor
  // is staff and is bounced, as before.
  const preview = viewer.preview ?? null;
  const isAdmin = actor.kind === 'staff';
  const user: Learner | null =
    actor.kind === 'learner' ? (db.users.find((u) => u.id === actor.userId) ?? null) : null;
  const staff: Staff | null =
    actor.kind === 'staff' ? (db.staff.find((x) => x.id === actor.staffId) ?? db.staff[0] ?? null) : null;
  const isTeam = user?.tier === 'team';
  const person = isAdmin ? staff : user;

  // The staff role the sidebar's Console rows are filtered by (D-157): the viewer's own staff row, never
  // the fallback above, so it is the `users.staff_role` the API authorizes with. The fixture build may
  // preview another role (its role switch, in `data/console-fixture.ts`); the http build has none.
  const staffRole = actor.kind === 'staff' ? (db.staff.find((x) => x.id === actor.staffId)?.role ?? null) : null;
  const [previewRole, setPreviewRole] = useState<string | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    void fixtureConsoleRole().then((r) => {
      if (alive) setPreviewRole(r);
    });
    return () => {
      alive = false;
    };
  }, [isAdmin]);
  const navRole = previewRole ?? staffRole;

  // A plan that opens no AI Employee has no cohort screens to show (D-119): its Skill Library.
  // Worked out while rendering, not after, so the shell draws nothing on its way there and a direct
  // visit to `/` never flashes the empty cohort dashboard first (D-150).
  const path = location.pathname;
  const away = !isAdmin && user ? noPortalRedirect(db, path) : null;
  useAppReady(away === null);

  const mods = useMemo(() => visibleModules(db), [db]);

  // ---- the Locked Employee Preview ------------------------------------------------------------
  const lockedMods = useMemo(() => (user ? mods.filter((m) => !canAccess(user, m)) : []), [mods, user]);

  const lockedItems = useMemo<LockedItem[]>(
    () =>
      lockedMods.map((m) => {
        const sess = m.session ? sessionFor(db, user?.cohortId ?? DEFAULT_COHORT, m.session) : null;
        return {
          id: m.id,
          name: m.name,
          short: m.short,
          icon: ICONS[m.icon],
          headline: m.headline || m.outcome,
          outputs: m.outputs.filter(Boolean).slice(0, 3),
          sessLine: sess ? `Session ${sess.n} · ${fmt.day(sess.start)}` : 'Self-paced',
        };
      }),
    [db, lockedMods, user],
  );

  const openLocked = useCallback(
    (moduleId: string) => {
      setLocked(Math.max(0, lockedMods.findIndex((m) => m.id === moduleId)));
      setDrawerOpen(false);
    },
    [lockedMods],
  );

  const closeLocked = useCallback(() => setLocked(null), []);
  const lockedOpen = locked != null && lockedItems.length > 0;

  // ---- navigating -----------------------------------------------------------------------------
  const go = useCallback(
    (to: string) => {
      setDrawerOpen(false);
      setLocked(null);
      navigate(to);
      const el = mainRef.current;
      if (el) el.scrollTop = 0;
    },
    [navigate],
  );

  const runAction = useCallback(
    (action: NavAction) => {
      if ('to' in action) go(action.to);
      else if ('openLocked' in action) openLocked(action.openLocked);
      else setEmpOpen((v) => !v);
    },
    [go, openLocked],
  );

  const isAdminPath = path === ADMIN_ROOT || path.startsWith(`${ADMIN_ROOT}/`);
  const employeeId = segmentAfter(path, EMP_PREFIX);

  // ---- guards (SCREENS § 2, phase 04 § 4.1) ---------------------------------------------------
  useEffect(() => {
    const replace = (to: string) => {
      navigate(to, { replace: true });
    };

    if (isAdmin) {
      if (!isAdminPath) replace(ADMIN_ROOT);
      return;
    }
    if (!user) return;
    if (away) {
      replace(away);
      return;
    }
    if (isAdminPath) {
      replace('/');
      return;
    }
    if (path === '/team' && !isTeam) {
      replace('/');
      return;
    }
    if (path === '/team-tier' && isTeam) {
      replace('/');
      return;
    }
    if (!employeeId) return;

    const m = mods.find((x) => x.id === employeeId);
    if (!m) {
      replace('/');
      return;
    }
    if (canAccess(user, m)) return;
    // A locked AI Employee never becomes a page: it lands on the first accessible one and sells
    // the Team tier instead.
    const first = mods.find((x) => canAccess(user, x));
    replace(first ? `${EMP_PREFIX}${first.id}` : '/');
    openLocked(m.id);
  }, [away, employeeId, isAdmin, isAdminPath, isTeam, mods, navigate, openLocked, path, user]);

  // ---- Escape closes every layer the shell owns -----------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setProfileOpen(false);
      setLocked(null);
      setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- the sidebar's own contents -------------------------------------------------------------
  const route = useMemo(() => ({ pathname: path }), [path]);

  const groups = useMemo<NavGroup[]>(() => {
    if (isAdmin) return consoleNav(db, route, collapsed, navRole);
    return user ? portalNav(db, user, route, now, collapsed, empOpen) : [];
  }, [collapsed, db, empOpen, isAdmin, navRole, now, route, user]);

  const cohort = db.cohorts.find((c) => c.id === (user?.cohortId ?? DEFAULT_COHORT)) ?? db.cohorts[0];
  // A learner with no AI Employee (D-119) has no cohort line: nothing in the cohort is theirs.
  const contextLine =
    !cohort || (!isAdmin && mods.length === 0)
      ? ''
      : isAdmin
        ? `Admin Console · ${cohort.name} Cohort`
        : cohortLine(cohort, now, db.sessions);

  const sbToggleLabel = collapsed ? 'Expand Sidebar' : 'Collapse Sidebar';
  const toggleSidebar = useCallback(() => {
    savePrefs({ sidebar: loadPrefs().sidebar === 'rail' ? 'full' : 'rail' });
  }, []);

  const tag = isAdmin ? 'Owner · Admin Console' : isTeam && user ? `${user.role} · Team Tier` : 'Agent Tier';

  // ---- the header -----------------------------------------------------------------------------
  const builderId = segmentAfter(path, BUILDER_PREFIX);
  const employeeName = employeeId
    ? (mods.find((m) => m.id === employeeId)?.name ?? '')
    : builderId && builderId !== 'new'
      ? (db.modules.find((m) => m.id === builderId)?.name ?? '')
      : '';

  // ---- the profile menu -----------------------------------------------------------------------
  const sample = nextSession(db, user, now) ?? db.sessions[2] ?? db.sessions[0];
  // D-152: the real sign-out (the prototype only toasted). On success the page is torn down and
  // replaced by /sign-in; only a failure comes back here, and says so.
  const signOut = useCallback(() => {
    setProfileOpen(false);
    void endSession().then((ok) => {
      if (!ok) toast(SIGN_OUT_FAILED, 'warn');
    });
  }, [toast]);

  const shellApi = useMemo(() => ({ openLocked, sidebarMode: mode, vw }), [mode, openLocked, vw]);

  // On the way to the Skill Library (D-150): nothing of the portal is drawn, not even for a frame.
  if (away) return null;

  return (
    <ShellProvider value={shellApi}>
      <div className={s.shell}>
        {drawer && drawerOpen ? <div className={s.scrim} onClick={() => setDrawerOpen(false)} /> : null}

        <aside
          aria-label="Primary"
          className={s.sidebar}
          data-mode={mode}
          data-open={drawer && drawerOpen ? 'true' : undefined}
          style={NAV_VARS}
        >
          <div className={s.brand} data-phone="bar">
            <BrandSlot kind={expanded ? 'lockup' : 'mark'} />
            {drawer ? (
              <button type="button" className={s.close} aria-label="Close menu" data-phone="bar-button" onClick={() => setDrawerOpen(false)}>
                <Icon name="x" size={16} strokeWidth={2} />
              </button>
            ) : null}
          </div>

          {expanded && contextLine ? <div className={s.context}>{contextLine}</div> : null}

          <nav aria-label="Main" className={s.nav}>
            {groups.map((g, gi) => (
              <div key={g.label ?? `group-${gi}`} className={s.group}>
                {g.showLabel && g.label ? <div className={s.groupLabel}>{g.label}</div> : null}
                {g.items.map((it) => (
                  <NavItem
                    key={it.key}
                    label={it.label}
                    icon={it.icon}
                    active={it.active}
                    locked={it.locked}
                    disabled={it.disabled}
                    depth={it.depth}
                    collapsed={collapsed}
                    token={it.token}
                    badge={it.badge}
                    badgeTitle={it.badgeTitle}
                    chev={it.chev}
                    title={it.title}
                    onClick={() => runAction(it.action)}
                  />
                ))}
              </div>
            ))}
          </nav>

          <div className={s.footer}>
            {drawer ? null : (
              <NavItem
                label={sbToggleLabel}
                icon="panel"
                collapsed={collapsed}
                title={sbToggleLabel}
                onClick={toggleSidebar}
              />
            )}
            <button
              type="button"
              className={s.profile}
              aria-haspopup="dialog"
              aria-expanded={profileOpen}
              title={`${person?.name ?? ''} · profile and settings`}
              onClick={() => setProfileOpen((v) => !v)}
            >
              <Avatar id={person?.id ?? ''} name={person?.name ?? ''} size={32} className={s.avatar} />
              {expanded ? (
                <>
                  <span className={s.who}>
                    <span className={s.name}>{person?.name ?? ''}</span>
                    <span className={s.tag}>{tag}</span>
                  </span>
                  <Icon name="chevUD" size={14} strokeWidth={2} className={s.profileChev} />
                </>
              ) : null}
            </button>
          </div>
        </aside>

        <div className={s.column}>
          <header className={s.header} data-phone="bar">
            {drawer ? (
              <>
                <button type="button" className={s.menu} aria-label="Open menu" data-phone="bar-button" onClick={() => setDrawerOpen(true)}>
                  <Icon name="menu" size={18} strokeWidth={1.9} />
                </button>
                {/* D-156: on a phone the sidebar is hidden, so the top bar carries the wordmark. */}
                <BrandSlot kind="head" />
              </>
            ) : null}
            <Breadcrumbs pathname={path} employeeName={employeeName} onNavigate={go} />
            <DemoControls vw={vw} />
          </header>

          {preview ? (
            // A staff member's "Preview as learner" tab (D-138). A plain link, not the router: the
            // preview is read at boot, so leaving it is a fresh load of the Admin Console.
            <div className={s.preview} role="status">
              <span>Previewing as {PREVIEW_LABEL[preview]}.</span>
              <a className={s.previewExit} href={EXIT_PREVIEW_TO}>
                Exit Preview
              </a>
            </div>
          ) : null}

          <main ref={mainRef} className={s.main}>
            <Outlet />
          </main>
        </div>

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

        {lockedOpen ? (
          <div className={s.lockedScrim} onClick={closeLocked}>
            <div className={s.lockedBox} onClick={(e) => e.stopPropagation()}>
              <LockedEmployeePreview
                items={lockedItems}
                index={locked ?? 0}
                onIndex={(i) => setLocked(i)}
                onClose={closeLocked}
                onCta={() => {
                  setLocked(null);
                  go('/team-tier');
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </ShellProvider>
  );
}

/**
 * The route module React Router lazy-loads. The toast and confetti viewports wrap the outlet, not
 * the other way round, because `useMutate()` — which every screen calls — resolves both from
 * context.
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

/**
 * Staff get the Admin redesign R2 shell (D-160 R2-1b, `admin/AdminShell.tsx`); everyone else, a staff
 * member's "Preview as learner" tab included (its actor is the learner), gets the portal shell above,
 * unchanged.
 */
function Frame() {
  const viewer = useViewer();
  return viewer.actor.kind === 'staff' ? <AdminShell /> : <Shell />;
}

export default Component;
