# Phase 04: App Shell, Routing and the Data Layer

**Goal.** Build the frame every screen lives in: the sidebar (full, rail and drawer), the header and breadcrumbs, the profile menu (time zone and theme), toasts, confetti, the Locked Preview modal and the demo controls. Build it on a data layer with two interchangeable sources:
- **fixture**: in-browser, seeded from `@ai/core` `seed(phase)`. It reproduces the prototype and powers the compliance suite and the sales/investor demo.
- **http**: the real API (phase 07).

**Ships when:** `pnpm gate 4` is green. That requires the 10 `shell-*` parity scenarios plus the e2e tests below.

---

## 4.1 Routes

`apps/web/src/router.tsx` (React Router data router):
```tsx
import { createBrowserRouter, Navigate } from 'react-router';
export const router = createBrowserRouter([
  { path: '/sign-in', lazy: () => import('./routes/auth/SignIn') },           // phase 07
  { path: '/invite/:token', lazy: () => import('./routes/auth/AcceptInvite') }, // phase 07
  { path: '/__states', lazy: () => import('./routes/__states') },               // dev/test only
  { path: '/__tokens', lazy: () => import('./routes/__tokens') },               // dev/test only
  {
    path: '/', lazy: () => import('./shell/AppShell'),
    children: [
      { index: true, lazy: () => import('./routes/portal/Dashboard') },
      { path: 'sessions', lazy: () => import('./routes/portal/Sessions') },
      { path: 'employees/:employeeId', lazy: () => import('./routes/portal/EmployeeDetail') },
      { path: 'team', lazy: () => import('./routes/portal/TeamHub') },
      { path: 'vault', lazy: () => import('./routes/portal/Vault') },
      { path: 'team-tier', lazy: () => import('./routes/portal/TeamTier') },
      { path: 'admin', lazy: () => import('./routes/admin/Overview') },
      { path: 'admin/curriculum', lazy: () => import('./routes/admin/Curriculum') },
      { path: 'admin/curriculum/:employeeId', lazy: () => import('./routes/admin/ModuleBuilder') }, // "new" = blank
      { path: 'admin/cohorts', lazy: () => import('./routes/admin/Cohorts') },
      { path: 'admin/learners', lazy: () => import('./routes/admin/Learners') },
      { path: 'admin/vault', lazy: () => import('./routes/admin/VaultManager') },
      { path: 'admin/announcements', lazy: () => import('./routes/admin/Announcements') },
      { path: 'admin/tiers', lazy: () => import('./routes/admin/Tiers') },
      { path: 'admin/staff', lazy: () => import('./routes/admin/Staff') },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
```
Guards run in `AppShell` and match the prototype:
- Staff on a portal route go to `/admin`.
- Learners on `/admin*` go to `/`.
- Agent tier on `/team` goes to `/`.
- Team tier on `/team-tier` goes to `/`.
- A locked `/employees/:id` redirects to the first accessible employee and opens the Locked Preview.

## 4.2 Repository interface

`apps/web/src/data/repository.ts`
```ts
import type { Db, Actor, Outcome } from '@ai/core';
import * as M from '@ai/core/mutations';

export type MutationName = keyof typeof M;          // 'toggleStep' | 'markDeployed' | …
export type MutationArgs<K extends MutationName> = Parameters<(typeof M)[K]>[2];

export interface Viewer { actor: Actor; role: 'agent' | 'owner' | 'admin' | 'learner'; }
export interface LmsRepository {
  readonly source: 'fixture' | 'http';
  viewer(): Promise<Viewer>;
  snapshot(): Promise<Db>;                           // role-scoped in http mode
  run<K extends MutationName>(name: K, args: MutationArgs<K>): Promise<Omit<Outcome, 'db'>>;
  subscribe(onChange: () => void): () => void;       // cross-tab (fixture) or SSE (http)
}
```

### FixtureRepository (reproduces the prototype)

`apps/web/src/data/fixture.ts`
```ts
import { seed, type Db, type Phase } from '@ai/core';
import * as M from '@ai/core/mutations';
import { clock } from '../lib/clock';
import type { LmsRepository, Viewer } from './repository';

const PERSONA = { agent: { kind: 'learner', userId: 'u_jamie' }, owner: { kind: 'learner', userId: 'u_alex' }, admin: { kind: 'staff', staffId: 'st1' } } as const;
const key = (p: Phase) => 'amplified-impact-lms-db' + (p === 'live' ? '' : ':' + p);

export function createFixtureRepository(role: keyof typeof PERSONA, phase: Phase): LmsRepository {
  const load = (): Db => { try { const d = JSON.parse(localStorage.getItem(key(phase)) || 'null'); if (d?.v === seed(phase).v) return d; } catch {} return seed(phase); };
  let db = load(); let n = 0;
  const listeners = new Set<() => void>();
  window.addEventListener('storage', (e) => { if (e.key === key(phase)) { db = load(); listeners.forEach((f) => f()); } });
  return {
    source: 'fixture',
    async viewer(): Promise<Viewer> { return { actor: PERSONA[role], role }; },
    async snapshot() { return db; },
    async run(name, args) {
      const ctx = { now: clock.now(), id: (p: string) => `${p}${clock.now().toString(36)}${(n++).toString(36)}` };
      const out = (M[name] as any)(db, PERSONA[role], args, ctx);
      if (!out.error) { db = out.db; localStorage.setItem(key(phase), JSON.stringify(db)); listeners.forEach((f) => f()); }
      const { db: _, ...rest } = out; return rest;
    },
    subscribe(f) { listeners.add(f); return () => listeners.delete(f); },
  };
}
export const resetFixture = (phase: Phase) => localStorage.removeItem(key(phase));
```
The localStorage keys and shapes are **the same as the prototype's**. A fixture app tab and a prototype tab can sync, which is useful for side-by-side QA.

### Choosing the source at boot

`apps/web/src/data/boot.ts`
```ts
const source = import.meta.env.VITE_DATA_SOURCE ?? 'http';
const qs = new URLSearchParams(location.search);
if (source === 'fixture') {
  const role = (qs.get('as') ?? sessionStorage.getItem('ai-lms-role') ?? 'agent') as 'agent' | 'owner' | 'admin';
  const phase = (qs.get('phase') ?? loadPrefs().phase ?? 'live') as Phase;
  sessionStorage.setItem('ai-lms-role', role); savePrefs({ phase });
  clock.useDemo(qs.get('now') ? Date.parse(qs.get('now')!) : phaseNow(phase)); // now = start + (Date.now() − boot)
  repo = createFixtureRepository(role, phase);
} else {
  clock.useReal();
  repo = createHttpRepository();                     // phase 07
}
export const demoMode = source === 'fixture' && (import.meta.env.VITE_DEMO_MODE === 'true' || qs.get('demo') === '1');
```
**Production safety.** In `http` mode the `as`, `phase` and `now` query params are ignored, and `demoMode` is always `false`. Add a unit test for this. `?now=<ISO>` exists only so e2e tests can pin the fixture clock to a specific moment, such as the join window.

`apps/web/src/lib/clock.ts`
```ts
let base = 0, boot = 0, demo = false;
export const clock = {
  useReal() { demo = false; },
  useDemo(phaseNow: number) { demo = true; base = phaseNow; boot = Date.now(); },
  now: () => (demo ? base + (Date.now() - boot) : Date.now()),
};
```
Under Playwright's fixed time, `clock.now()` equals `PHASE_NOW` exactly. That is the same condition the goldens were captured in.

### React bindings

`apps/web/src/data/hooks.ts` (TanStack Query):
```ts
export function useDb() {
  const qc = useQueryClient();
  useEffect(() => repo.subscribe(() => qc.invalidateQueries({ queryKey: ['db'] })), [qc]);
  return useSuspenseQuery({ queryKey: ['db'], queryFn: () => repo.snapshot() }).data;
}
export function useMutate() {
  const qc = useQueryClient(); const { toast } = useToaster(); const { celebrate } = useConfetti();
  return async <K extends MutationName>(name: K, args: MutationArgs<K>) => {
    const r = await repo.run(name, args);
    if (r.error) return r;                                    // forms render r.error inline
    if (r.toast) toast(r.toast.msg, r.toast.tone);
    if (r.effects?.some((e) => e.type === 'confetti')) celebrate();
    await qc.invalidateQueries({ queryKey: ['db'] });
    return r;
  };
}
export function useNow(intervalMs = 1000) { /* re-render every interval; returns clock.now() */ }
```
Set `data-app-ready="true"` on `<body>` once the first `snapshot()` has resolved and `document.fonts.ready` has settled. The compliance harness waits for it.

## 4.3 Shell layout

`apps/web/src/shell/AppShell.tsx` structure. **The landmarks and attributes are required by the harness.**
```tsx
<div className={s.shell}>                                  {/* flex, 100vh, overflow hidden */}
  {drawer && drawerOpen && <div className={s.scrim} onClick={closeDrawer} />}
  <aside aria-label="Primary" className={s.sidebar} data-mode={mode}
         style={{ '--nav-hover': 'color-mix(in oklch, var(--line-default) 70%, var(--bg-sidebar))', '--nav-active': 'var(--action-primary-tint)' } as CSSProperties}>
    <BrandRow />  <ContextLine />  <Nav groups={navModel} collapsed={mode === 'rail'} />  <SidebarFooter />
  </aside>
  <div className={s.column}>
    <header className={s.header}>
      {drawer && <IconButton aria-label="Open menu" icon="menu" onClick={openDrawer} />}
      <nav aria-label="Breadcrumb">{crumbs}</nav>
      {demoMode && <DemoControls />}
    </header>
    <main ref={mainRef} className={s.main}><Outlet /></main>
  </div>
  {profileOpen && <ProfileMenu />}
  {locked != null && <LockedPreviewModal />}
  <Toaster /> <Confetti />
</div>
```
- `mode = vw < 768 ? 'drawer' : prefs.sidebar === 'rail' ? 'rail' : 'full'`. Read `vw` with a `ResizeObserver` on `document.documentElement` **and** `window.innerWidth` on every render. The prototype once got stuck in drawer mode when it started hidden.
- Esc closes the profile menu, the demo popover, the Locked Preview and the drawer.
- Navigation scrolls `main` to the top and closes the drawer.
- `--nav-active` is `var(--action-primary-tint)` (D-031; was `var(--bg-surface)`). The active row is that tint with an `--action-primary` label and icon at weight 600 and no ring or shadow; inactive rows use `--text-primary` for label and icon.
- `BrandSlot` renders the committed logo, with `data-brand-slot` on its wrapper (one per logo): the `ai academy` app lockup at 161×34 in the expanded sidebar and the drawer, switching to the reversed lockup in dark theme (keyed on `:root[data-theme]`, not `prefers-color-scheme`), and the favicon drawing at 28×28 in the collapsed rail. This replaced the dashed 28×28 mark and 132×22 wordmark placeholders and retired `VITE_BRAND_LOGO_URL` / `VITE_BRAND_WORDMARK_URL` (D-031). The brand row is not masked in parity; `compliance/tests/e2e/brand.spec.ts` asserts the right variant per theme.

### Nav model (port of the prototype shell's `renderVals`)

`apps/web/src/shell/navModel.ts`
```ts
export function portalNav(db: Db, user: Learner, route: Route, now: number, collapsed: boolean, empOpen: boolean): NavGroup[] {
  const mods = visibleModules(db);
  const kids = mods.map((m) => {
    const locked = !canAccess(user, m), soon = !locked && !isOpen(m, now), b = buildOf(user, m);
    return {
      key: m.id, label: m.short, icon: m.icon, depth: collapsed ? 0 : 1, locked,
      token: locked ? null : soon ? { kind: 'custom', tone: 'neutral', icon: 'clock', label: m.opens ? fmt.date(m.opens) : 'Soon' } : { kind: 'build', state: b.state, n: b.n, total: b.total },
      title: locked ? `${m.name} · Team tier` : soon ? `${m.name} · Opens ${m.opens ? fmt.date(m.opens) : 'soon'}`
        : `${m.name} · ${b.state === 'verified' ? 'Built' : b.state === 'in_progress' ? `${b.n} of ${b.total} steps verified` : 'Not started'}`,
      active: route.name === 'employee' && route.id === m.id,
      onClick: locked ? { openLocked: m.id } : { to: `/employees/${m.id}` },
    };
  });
  const included = mods.filter((m) => canAccess(user, m)).length;
  const main = [item('dashboard', 'Dashboard', 'grid', '/'), item('sessions', 'Sessions', 'radio', '/sessions')];
  const tail = [...(user.tier === 'team' ? [item('team', 'Team Hub', 'users', '/team')] : []), item('vault', 'Resource Vault', 'archive', '/vault')];
  const head = { key: 'emp', label: 'AI Employees', icon: 'bot', badge: String(included), badgeTitle: `${included} included in your tier`, chev: empOpen ? 'open' : 'closed', onClick: { toggleEmployees: true } };
  return collapsed ? [{ items: main }, { items: kids }, { items: tail }] : [{ items: [...main, head, ...(empOpen ? kids : []), ...tail] }];
}
// adminNav(): groups Insights / Content / Delivery / People / Revenue exactly as SCREENS §2.1, including the draft-count and new-request badges.
```

### Profile menu, time zone and theme
- `Change` toggles the zone list. Choosing a zone calls `savePrefs({ tz })`, which calls `setViewerZone`, and **every rendered time updates immediately** because `useDb`/`useNow` consumers re-render on the `ai-prefs` event.
- The menu hint shows `Session Times Show as ${fmt.time(nextSession.start)}`.
- Theme calls `savePrefs({ theme })`, which sets `data-theme`.
- In http mode, `tz` and `theme` are also saved to the user profile (`PATCH /api/me/prefs`, phase 07) and restored at sign-in.

### Demo controls (`demoMode` only)
Copy SCREENS §2.2.
- **View As** reloads with `?as=`.
- **Timeline** reloads with `?phase=`.
- **Reset Demo** calls `resetFixture(phase)` and reloads, showing the toast `Demo data reset`.

---

## Gate 4: Ship Checklist

**Parity** (automated): `GATE=4 pnpm compliance` runs every `@g3` and `@g4` scenario: the shell for agent, owner and admin; rail; laptop; dark; mobile header; mobile drawer; profile menu in Eastern time; and the Locked Preview dialog. The sidebar and header regions must match pixels (≤ 1%) and fingerprints (exact).

**E2E** (`compliance/tests/e2e/shell.spec.ts`, fixture build):
```ts
import { test, expect } from '@playwright/test';
import { open } from '../../lib/prepare';

const base = { gate: 4, role: 'agent', ref: 'dashboard', path: '/' } as const;

test('collapse persists across reload @g4', async ({ browser }) => {
  const { page } = await open(browser, { id: 'x', ...base }, 'app');
  await page.getByRole('button', { name: 'Collapse Sidebar' }).click();
  await expect(page.locator('aside[aria-label="Primary"]')).toHaveCSS('width', '64px');
  await page.reload();
  await expect(page.locator('aside[aria-label="Primary"]')).toHaveCSS('width', '64px');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ai-lms-prefs')!).sidebar)).toBe('rail');
});

test('mobile drawer opens, traps focus, closes on Esc and scrim @g4', async ({ browser }) => {
  const { page } = await open(browser, { id: 'x', ...base, viewport: 'mobile' }, 'app');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.locator('aside[aria-label="Primary"]')).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.locator('aside[aria-label="Primary"]')).not.toBeInViewport();
});

test('time zone change updates every time on screen @g4', async ({ browser }) => {
  const { page } = await open(browser, { id: 'x', ...base }, 'app');
  await page.getByRole('button', { name: /Jamie Ortiz/ }).click();
  await page.getByRole('button', { name: 'Change' }).click();
  await page.getByRole('radio', { name: /Eastern/ }).click();
  await expect(page.getByText('Session Times Show as 2:00 PM ET (1:00 PM CT)')).toBeVisible();
});

test('theme toggle sets data-theme and persists @g4', async ({ browser }) => {
  const { page } = await open(browser, { id: 'x', ...base }, 'app');
  await page.getByRole('button', { name: /Jamie Ortiz/ }).click();
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('locked employee never navigates, opens preview, CTA goes to Team Tier @g4', async ({ browser }) => {
  const { page } = await open(browser, { id: 'x', ...base }, 'app');
  await page.locator('aside[aria-label="Primary"]').getByRole('button', { name: /Meetings/ }).click();
  await expect(page).toHaveURL(/\/$|\/\?/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('tab', { name: 'Finance' }).click();
  await page.getByRole('button', { name: /See Team Tier/ }).click();
  await expect(page).toHaveURL(/\/team-tier/);
});

test('admin cannot reach portal routes and learners cannot reach admin @g4', async ({ browser }) => {
  const a = await open(browser, { id: 'x', ...base, role: 'admin', path: '/sessions' }, 'app');
  await expect(a.page).toHaveURL(/\/admin/);
  const l = await open(browser, { id: 'y', ...base, path: '/admin/tiers' }, 'app');
  await expect(l.page).toHaveURL(/\/(\?|$)/);
});

test('every interactive element in the shell has a visible focus ring @g4', async ({ browser }) => {
  const { page } = await open(browser, { id: 'x', ...base }, 'app');
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement!).boxShadow);
    expect(ring).not.toBe('none');
  }
});
```
**Unit:** in http mode, `?as=admin&demo=1` is ignored, `demoMode` is false, and the demo controls are not in the DOM.
