# Phase 00: Repository, Tooling and the Compliance Harness

**Goal.** By the end of this phase you have a GitHub monorepo, a working CI pipeline, a Railway project, and an automated way to compare anything you build against the reference prototype. You build the comparison harness *before* any UI so that every later phase can be checked against the prototype.

**Ships when:** `pnpm gate 0` is green locally (in Docker) and in CI.

---

## 0.1 Prerequisites

- Node 24 LTS (`.nvmrc` → `24`) and pnpm 10 via Corepack: `corepack enable && corepack use pnpm@latest-10`.
- Docker, for deterministic screenshots.
- The Railway CLI (`npm i -g @railway/cli`), logged in with `railway login`.
- A GitHub repository named `amplified-impact-lms` (private), with the Railway GitHub app installed on it.

## 0.2 Repository layout

```
amplified-impact-lms/
├─ apps/
│  ├─ web/                 Vite + React 19 + TypeScript SPA (portal + admin)
│  └─ api/                 Fastify 5 + Drizzle + Postgres (serves /api and the built SPA)
├─ packages/
│  └─ core/                TypeScript port of design-reference/lms-data.js (shared)
├─ design-reference/       The handoff /reference, rebranded (D-031); changed only through a DECISIONS.md entry
├─ compliance/
│  ├─ playwright.config.ts
│  ├─ lib/                 scenarios.ts, prepare.ts, fingerprint.ts, regions.ts, a11y.ts
│  ├─ tests/               capture.spec.ts, parity.*.spec.ts, e2e/*.spec.ts
│  └─ goldens/             PNG + JSON captured from the reference (committed)
├─ scripts/gate.mjs
├─ .railway/railway.ts
├─ .github/workflows/ci.yml
├─ CLAUDE.md               (from the handoff)
└─ DECISIONS.md            Any approved deviation from the mockup, with the reason
```

Copy the handoff folders in now:
- `reference/` → `design-reference/` (superseded by D-031: it now holds the rebranded reference, changed only through a DECISIONS.md entry)
- `starter/` → keep at `handoff-starter/`; later phases move its files into place.
- `DESIGN.md` and `SCREENS.md` → `docs/`.

## 0.3 Root files

`package.json`
```json
{
  "name": "amplified-impact-lms",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "pnpm --parallel --filter @ai/web --filter @ai/api dev",
    "build": "pnpm --filter @ai/core build && pnpm --filter @ai/web build && pnpm --filter @ai/api build",
    "start": "pnpm --filter @ai/api start",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "reference": "http-server design-reference -p 4400 -s -c-1 --cors",
    "compliance:capture": "playwright test -c compliance/playwright.config.ts --project=reference",
    "compliance": "playwright test -c compliance/playwright.config.ts --project=parity",
    "e2e": "playwright test -c compliance/playwright.config.ts --project=e2e",
    "compliance:docker": "docker run --rm --network host -v $PWD:/work -w /work mcr.microsoft.com/playwright:v$(node -p \"require('@playwright/test/package.json').version\")-noble bash -lc 'corepack enable && pnpm i --frozen-lockfile && pnpm \"$@\"' --",
    "gate": "node scripts/gate.mjs"
  },
  "devDependencies": {
    "@axe-core/playwright": "latest",
    "@playwright/test": "PIN-ONE-VERSION",
    "eslint": "^9", "typescript": "^5.8", "http-server": "^14", "prettier": "^3"
  }
}
```

> **Pin `@playwright/test` to one exact version** (no `^`). Screenshot goldens depend on the Chromium build. Upgrading Playwright is a deliberate change that re-captures the goldens in the same PR.

`pnpm-workspace.yaml`
```yaml
packages:
  - apps/*
  - packages/*
```

`tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2023", "module": "ESNext", "moduleResolution": "Bundler",
    "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": false,
    "jsx": "react-jsx", "skipLibCheck": true, "resolveJsonModule": true, "isolatedModules": true,
    "baseUrl": ".", "paths": { "@ai/core": ["packages/core/src/index.ts"] }
  }
}
```

## 0.4 Scaffold the apps

```bash
pnpm create vite apps/web --template react-ts
mkdir -p apps/api/src packages/core/src
pnpm --filter @ai/web add react-router @tanstack/react-query clsx
pnpm --filter @ai/api add fastify @fastify/static @fastify/cookie zod
pnpm --filter @ai/api add -D tsx vitest
pnpm --filter @ai/core add -D vitest
```

Rename the packages to `@ai/web`, `@ai/api` and `@ai/core`. Add `"typecheck": "tsc --noEmit"` and `"test": "vitest run"` to each.

`apps/web/package.json` scripts. The `fixture` mode reproduces the prototype exactly and is what the compliance suite runs against:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "build:fixture": "VITE_DATA_SOURCE=fixture VITE_ENABLE_STATES=true vite build --outDir dist-fixture",
  "preview:fixture": "pnpm build:fixture && vite preview --outDir dist-fixture --port 4173 --strictPort"
}
```

`apps/api/src/server.ts` (minimum for this phase):
```ts
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';

const app = Fastify({ logger: true });
app.get('/api/health', async () => ({ ok: true, version: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'dev' }));

const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
await app.register(fastifyStatic, { root: webDist, wildcard: false });
app.setNotFoundHandler((req, reply) =>
  req.url.startsWith('/api/') ? reply.code(404).send({ error: 'Not found' }) : reply.sendFile('index.html'));

await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3000) });
```

## 0.5 The compliance harness

The harness captures the **reference prototype** under frozen, deterministic conditions and stores what it sees as *goldens*. Every later phase runs the same scenarios against **your app** and must match those goldens.

The prototype reads its route from the URL hash: `Amplified Impact LMS.dc.html#<role>/<screen>/<id>`.
- Roles: `agent`, `owner`, `admin`.
- Portal screens: `dashboard`, `sessions`, `workspace`, `team`, `vault`, `upgrade`.
- Admin screens: `overview`, `curriculum`, `builder`, `cohorts`, `learners`, `avault`, `announce`, `tiers`, `staff`.
- Timeline and theme come from `localStorage['ai-lms-prefs']` (`{ phase, theme, tz, sidebar }`).
- The prototype's clock is `PHASE_NOW[phase] + (Date.now() − mount time)`. Freezing `Date.now()` therefore pins it to `PHASE_NOW[phase]` exactly.

### `compliance/lib/scenarios.ts`
```ts
export type Role = 'agent' | 'owner' | 'admin';
export type Region = 'page' | 'sidebar' | 'header' | 'main' | 'dialog' | 'drawer';
export type Action =
  | { click: { role: 'button' | 'tab' | 'link' | 'row' | 'menuitem'; name: string | RegExp; within?: 'sidebar' | 'main' | 'header' | 'dialog'; nth?: number } }
  | { fill: { label: string; value: string } }
  | { press: string }
  | { scroll: { region: 'main'; y: number } };

export interface Scenario {
  id: string;                                 // golden file stem, e.g. "dash-agent-live"
  gate: 3 | 4 | 5 | 6 | 7;                    // first phase gate that must pass this scenario
  role: Role;
  ref: string;                                // reference hash after role, e.g. "workspace/marketing"
  path: string;                               // app route, e.g. "/employees/marketing"
  phase?: 'week0' | 'live' | 'post';          // default 'live'
  viewport?: 'desktop' | 'laptop' | 'mobile' | 'sheet';
  theme?: 'light' | 'dark';
  tz?: string;                                // default America/Chicago
  sidebar?: 'full' | 'rail';
  refFile?: string;                           // default "Amplified Impact LMS.dc.html"
  actions?: Action[];
  regions?: Region[];                         // default ['page', 'main']
}

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
  sheet: { width: 3000, height: 1400 },
} as const;

export const PHASE_NOW = {
  week0: '2026-11-27T10:42:00-06:00',
  live: '2026-12-07T10:42:00-06:00',
  post: '2027-01-12T10:42:00-06:00',
} as const; // matches handoff-starter/fixtures/phase-now.json

const S = (s: Scenario) => s;
export const SCENARIOS: Scenario[] = [
  // Phase 03: component contract sheet
  S({ id: 'states-light', gate: 3, role: 'agent', ref: '', refFile: 'States.dc.html', path: '/__states', viewport: 'sheet', regions: ['page'] }),
  S({ id: 'states-dark', gate: 3, role: 'agent', ref: '', refFile: 'States.dc.html', path: '/__states', viewport: 'sheet', theme: 'dark', regions: ['page'] }),

  // Phase 04: shell (sidebar + header only)
  ...(['agent', 'owner', 'admin'] as const).map(role => S({ id: `shell-${role}`, gate: 4, role, ref: role === 'admin' ? 'overview' : 'dashboard', path: role === 'admin' ? '/admin' : '/', regions: ['sidebar', 'header'] })),
  S({ id: 'shell-agent-rail', gate: 4, role: 'agent', ref: 'dashboard', path: '/', sidebar: 'rail', regions: ['sidebar', 'header'] }),
  S({ id: 'shell-agent-laptop', gate: 4, role: 'agent', ref: 'dashboard', path: '/', viewport: 'laptop', regions: ['sidebar', 'header'] }),
  S({ id: 'shell-agent-dark', gate: 4, role: 'agent', ref: 'dashboard', path: '/', theme: 'dark', regions: ['sidebar', 'header'] }),
  S({ id: 'shell-agent-mobile', gate: 4, role: 'agent', ref: 'dashboard', path: '/', viewport: 'mobile', regions: ['header'] }),
  S({ id: 'shell-agent-mobile-drawer', gate: 4, role: 'agent', ref: 'dashboard', path: '/', viewport: 'mobile', actions: [{ click: { role: 'button', name: 'Open menu', within: 'header' } }], regions: ['sidebar'] }),
  S({ id: 'shell-profile-menu', gate: 4, role: 'agent', ref: 'dashboard', path: '/', tz: 'America/New_York', actions: [{ click: { role: 'button', name: /Jamie Ortiz/, within: 'sidebar' } }, { click: { role: 'button', name: 'Change' } }], regions: ['page'] }),
  S({ id: 'shell-locked-preview', gate: 4, role: 'agent', ref: 'dashboard', path: '/', actions: [{ click: { role: 'button', name: /Meetings/, within: 'sidebar' } }], regions: ['dialog'] }),

  // Phase 05: learner portal
  S({ id: 'dash-agent-live', gate: 5, role: 'agent', ref: 'dashboard', path: '/' }),
  S({ id: 'dash-agent-week0', gate: 5, role: 'agent', ref: 'dashboard', path: '/', phase: 'week0' }),
  S({ id: 'dash-agent-post', gate: 5, role: 'agent', ref: 'dashboard', path: '/', phase: 'post' }),
  S({ id: 'dash-owner-live', gate: 5, role: 'owner', ref: 'dashboard', path: '/' }),
  S({ id: 'dash-agent-eastern', gate: 5, role: 'agent', ref: 'dashboard', path: '/', tz: 'America/New_York' }),
  S({ id: 'dash-agent-dark', gate: 5, role: 'agent', ref: 'dashboard', path: '/', theme: 'dark' }),
  S({ id: 'dash-agent-laptop', gate: 5, role: 'agent', ref: 'dashboard', path: '/', viewport: 'laptop' }),
  S({ id: 'dash-agent-mobile', gate: 5, role: 'agent', ref: 'dashboard', path: '/', viewport: 'mobile' }),
  S({ id: 'emp-agent-marketing', gate: 5, role: 'agent', ref: 'workspace/marketing', path: '/employees/marketing' }),
  S({ id: 'emp-agent-sales', gate: 5, role: 'agent', ref: 'workspace/sales', path: '/employees/sales' }),
  S({ id: 'emp-agent-database', gate: 5, role: 'agent', ref: 'workspace/database', path: '/employees/database' }),
  S({ id: 'emp-owner-meetings', gate: 5, role: 'owner', ref: 'workspace/meetings', path: '/employees/meetings' }),
  S({ id: 'emp-agent-marketing-transcript', gate: 5, role: 'agent', ref: 'workspace/marketing', path: '/employees/marketing', actions: [{ click: { role: 'button', name: 'Transcript', within: 'main' } }] }),
  S({ id: 'emp-agent-marketing-checklist', gate: 5, role: 'agent', ref: 'workspace/marketing', path: '/employees/marketing', actions: [{ scroll: { region: 'main', y: 900 } }] }),
  S({ id: 'emp-agent-marketing-prompt', gate: 5, role: 'agent', ref: 'workspace/marketing', path: '/employees/marketing', actions: [{ click: { role: 'button', name: 'View', within: 'main' } }], regions: ['drawer'] }),
  S({ id: 'emp-agent-laptop', gate: 5, role: 'agent', ref: 'workspace/sales', path: '/employees/sales', viewport: 'laptop' }),
  S({ id: 'emp-agent-mobile', gate: 5, role: 'agent', ref: 'workspace/sales', path: '/employees/sales', viewport: 'mobile' }),
  S({ id: 'sessions-agent', gate: 5, role: 'agent', ref: 'sessions', path: '/sessions' }),
  S({ id: 'sessions-owner-eastern', gate: 5, role: 'owner', ref: 'sessions', path: '/sessions', tz: 'America/New_York' }),
  S({ id: 'team-owner', gate: 5, role: 'owner', ref: 'team', path: '/team' }),
  S({ id: 'team-owner-invite', gate: 5, role: 'owner', ref: 'team', path: '/team', actions: [{ click: { role: 'button', name: 'Invite Member' } }], regions: ['page'] }),
  S({ id: 'team-owner-member', gate: 5, role: 'owner', ref: 'team', path: '/team', actions: [{ click: { role: 'row', name: /Priya Shah/ } }], regions: ['drawer'] }),
  S({ id: 'vault-agent', gate: 5, role: 'agent', ref: 'vault', path: '/vault' }),
  S({ id: 'vault-agent-exec', gate: 5, role: 'agent', ref: 'vault', path: '/vault', actions: [{ click: { role: 'button', name: /Executive Build Vault/ } }] }),
  S({ id: 'vault-owner-exec', gate: 5, role: 'owner', ref: 'vault', path: '/vault', actions: [{ click: { role: 'button', name: /Executive Build Vault/ } }] }),
  S({ id: 'tier-agent', gate: 5, role: 'agent', ref: 'upgrade', path: '/team-tier' }),

  // Phase 06: admin console
  ...([
    ['overview', '/admin'], ['curriculum', '/admin/curriculum'], ['builder/marketing', '/admin/curriculum/marketing'],
    ['builder', '/admin/curriculum/new'], ['cohorts', '/admin/cohorts'], ['learners', '/admin/learners'],
    ['avault', '/admin/vault'], ['announce', '/admin/announcements'], ['tiers', '/admin/tiers'], ['staff', '/admin/staff'],
  ] as const).map(([ref, path]) => S({ id: `admin-${ref.replace('/', '-') || 'new'}`, gate: 6, role: 'admin', ref, path })),
  S({ id: 'admin-builder-locked', gate: 6, role: 'admin', ref: 'builder/meetings', path: '/admin/curriculum/meetings', actions: [{ click: { role: 'button', name: 'Locked Preview' } }] }),
  S({ id: 'admin-cohorts-edit', gate: 6, role: 'admin', ref: 'cohorts', path: '/admin/cohorts', actions: [{ click: { role: 'button', name: 'Edit', nth: 2 } }], regions: ['drawer'] }),
  S({ id: 'admin-learners-teams', gate: 6, role: 'admin', ref: 'learners', path: '/admin/learners', actions: [{ click: { role: 'button', name: 'Teams' } }] }),
  S({ id: 'admin-learner-drawer', gate: 6, role: 'admin', ref: 'learners', path: '/admin/learners', actions: [{ click: { role: 'row', name: /Jamie Ortiz/ } }], regions: ['drawer'] }),
  S({ id: 'admin-vault-upload', gate: 6, role: 'admin', ref: 'avault', path: '/admin/vault', actions: [{ click: { role: 'button', name: 'Upload Resource' } }], regions: ['drawer'] }),
  S({ id: 'admin-overview-dark', gate: 6, role: 'admin', ref: 'overview', path: '/admin', theme: 'dark' }),
  S({ id: 'admin-overview-laptop', gate: 6, role: 'admin', ref: 'overview', path: '/admin', viewport: 'laptop' }),
];
```

> **Row clicks.** Reference table rows are clickable `div`s. In the app, give clickable table rows `role="row"` with an accessible name (the person's name), or render them as `button`s. `prepare.ts` resolves `role: 'row'` to `getByRole('row', …)` in the app, and to the *last* element whose text matches in the reference (the table comes after any summary cards). `nth` is 0-based.

### `compliance/lib/regions.ts`
These landmarks are **required in the app** with exactly these attributes:
```ts
export const REGION = {
  page: null, // full viewport
  sidebar: 'aside[aria-label="Primary"]',
  header: 'header:has(nav[aria-label="Breadcrumb"])',
  main: 'main',
  dialog: '[role="dialog"]',
  drawer: '[data-drawer="open"], aside:not([aria-label="Primary"])[style*="translateX(0"]',
} as const;

// No region is masked (D-031). Until the rebrand both builds drew placeholder brand slots, masked as
// reference ['aside [title^="Logo slot"]', 'aside [title^="Wordmark slot"]'] and app ['[data-brand-slot]'].
// Both now draw the same committed logo, so the brand row is compared like any other pixel.
export const MASKS: { reference: string[]; app: string[] } = { reference: [], app: [] };

// Prototype-only chrome that never exists in the app's fixture build.
export const REFERENCE_HIDE_CSS = `
  header [role="group"][aria-label="Demo controls"],
  header button[aria-expanded] { display: none !important; }
`;
```
The app's open drawer must carry `data-drawer="open"`.

### `compliance/lib/fingerprint.ts`
This produces a typography and copy fingerprint: every visible element with its own text, plus every form field. It is compared **exactly**, so it catches wrong copy, wrong case, wrong size, weight, line-height, letter-spacing or color, and missing or extra text.
```ts
import type { Page } from '@playwright/test';

export async function fingerprint(page: Page, selector: string | null): Promise<string[]> {
  return page.evaluate((sel) => {
    const root = sel ? document.querySelector(sel) : document.body;
    if (!root) return ['<missing region>'];
    const vw = window.innerWidth;
    const visible = (el: Element) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        if (e.getAttribute('aria-hidden') === 'true') return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right > 0 && r.left < vw;
    };
    const rows: string[] = [];
    root.querySelectorAll('*').forEach((el) => {
      const own = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '').join('').replace(/\s+/g, ' ').trim();
      if (!own || !visible(el)) return;
      const cs = getComputedStyle(el);
      rows.push([own, cs.fontFamily.split(',')[0]!.replace(/["']/g, '').trim(), cs.fontSize, cs.fontWeight,
        cs.lineHeight, cs.letterSpacing, cs.textTransform, cs.color].join(' | '));
    });
    root.querySelectorAll('input, textarea, select').forEach((el) => {
      const f = el as HTMLInputElement;
      if (!visible(f)) return;
      rows.push(['[field]', f.type, f.placeholder ?? '', f.type === 'checkbox' ? String(f.checked) : f.value].join(' | '));
    });
    return rows;
  }, selector);
}
```

### `compliance/lib/prepare.ts`
```ts
import type { Browser, Page } from '@playwright/test';
import { PHASE_NOW, VIEWPORTS, type Scenario, type Action } from './scenarios';
import { REGION, REFERENCE_HIDE_CSS } from './regions';

export type Target = 'reference' | 'app';
export const REF_BASE = 'http://localhost:4400';
export const APP_BASE = process.env.APP_URL ?? 'http://localhost:4173';

export async function open(browser: Browser, s: Scenario, target: Target) {
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[s.viewport ?? 'desktop'], deviceScaleFactor: 1, locale: 'en-US',
    timezoneId: s.tz ?? 'America/Chicago', colorScheme: s.theme === 'dark' ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(PHASE_NOW[s.phase ?? 'live']));
  const prefs = { phase: s.phase ?? 'live', theme: s.theme ?? 'light', tz: null, sidebar: s.sidebar ?? 'full' };
  await page.addInitScript((p) => localStorage.setItem('ai-lms-prefs', JSON.stringify(p)), prefs);

  const url = target === 'reference'
    ? `${REF_BASE}/${encodeURIComponent(s.refFile ?? 'Amplified Impact LMS.dc.html')}${s.ref ? `#${s.role}/${s.ref}` : ''}`
    : `${APP_BASE}${s.path}${s.path.includes('?') ? '&' : '?'}as=${s.role}&phase=${s.phase ?? 'live'}`;
  await page.goto(url);
  await settle(page, target);
  if (target === 'reference') await page.addStyleTag({ content: REFERENCE_HIDE_CSS });
  for (const a of s.actions ?? []) await act(page, a, target);
  await settle(page, target);
  return { ctx, page };
}

async function settle(page: Page, target: Target) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  if (target === 'reference') await page.waitForFunction(() => !document.body.innerText.includes('Loading…'));
  else await page.locator('[data-app-ready="true"]').waitFor();
  await page.waitForTimeout(350); // drawers 240ms, modals 200ms
}

async function act(page: Page, a: Action, target: Target) {
  if ('press' in a) return page.keyboard.press(a.press);
  if ('scroll' in a) return page.locator('main').evaluate((el, y) => el.scrollTo(0, y), a.scroll.y);
  if ('fill' in a) return page.getByLabel(a.fill.label).fill(a.fill.value);
  const { role, name, within, nth = 0 } = a.click;
  const scope = within ? page.locator(REGION[within]!) : page;
  // Reference rows are plain divs; the table is the last place a name appears on the page.
  if (role === 'row' && target === 'reference') return (a.click.nth != null ? scope.getByText(name).nth(nth) : scope.getByText(name).last()).click();
  return scope.getByRole(role, { name, exact: typeof name === 'string' }).nth(nth).click();
}
```

### `compliance/tests/capture.spec.ts` (reference → goldens)
```ts
import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import { SCENARIOS } from '../lib/scenarios';
import { open } from '../lib/prepare';
import { REGION, MASKS } from '../lib/regions';
import { fingerprint } from '../lib/fingerprint';

const OUT = new URL('../goldens/', import.meta.url);

for (const s of SCENARIOS) {
  test(`capture ${s.id}`, async ({ browser }) => {
    const { ctx, page } = await open(browser, s, 'reference');
    for (const r of s.regions ?? ['page', 'main']) {
      const sel = REGION[r];
      const mask = MASKS.reference.map((m) => page.locator(m));
      const png = sel
        ? await page.locator(sel).first().screenshot({ animations: 'disabled', mask, maskColor: '#FF00FF' })
        : await page.screenshot({ animations: 'disabled', mask, maskColor: '#FF00FF' });
      await fs.writeFile(new URL(`${s.id}.${r}.png`, OUT), png);
      await fs.writeFile(new URL(`${s.id}.${r}.json`, OUT), JSON.stringify(await fingerprint(page, sel), null, 1));
    }
    await ctx.close();
  });
}
```

### `compliance/tests/parity.spec.ts` (app → must match goldens)
```ts
import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { SCENARIOS } from '../lib/scenarios';
import { open } from '../lib/prepare';
import { REGION, MASKS } from '../lib/regions';
import { fingerprint } from '../lib/fingerprint';
import { expectAccessible } from '../lib/a11y';

const GATE = Number(process.env.GATE ?? 99);

for (const s of SCENARIOS.filter((x) => x.gate <= GATE)) {
  test(`${s.id} @g${s.gate}`, async ({ browser }) => {
    const { ctx, page } = await open(browser, s, 'app');
    for (const r of s.regions ?? ['page', 'main']) {
      const sel = REGION[r];
      const mask = MASKS.app.map((m) => page.locator(m));
      const png = sel
        ? await page.locator(sel).first().screenshot({ animations: 'disabled', mask, maskColor: '#FF00FF' })
        : await page.screenshot({ animations: 'disabled', mask, maskColor: '#FF00FF' });
      expect.soft(png, `${s.id} ${r} pixels`).toMatchSnapshot(`${s.id}.${r}.png`);
      const ref = JSON.parse(await fs.readFile(new URL(`../goldens/${s.id}.${r}.json`, import.meta.url), 'utf8'));
      expect.soft(await fingerprint(page, sel), `${s.id} ${r} copy + typography`).toEqual(ref);
    }
    await expectAccessible(page);
    await ctx.close();
  });
}
```

### `compliance/lib/a11y.ts`
```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
export async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}
```

### `compliance/playwright.config.ts`
```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  snapshotPathTemplate: '{testDir}/../goldens/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'report' }]],
  expect: { toMatchSnapshot: { maxDiffPixelRatio: 0.01, threshold: 0.15 } },
  projects: [
    { name: 'reference', testMatch: /capture\.spec\.ts/ },
    { name: 'parity', testMatch: /parity\.spec\.ts/ },
    { name: 'e2e', testMatch: /e2e\/.*\.spec\.ts/ },
  ],
  webServer: [
    { command: 'pnpm reference', url: 'http://localhost:4400/lms-data.js', reuseExistingServer: !process.env.CI },
    { command: 'pnpm --filter @ai/web preview:fixture', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI, timeout: 180_000 },
  ],
});
```

**Tolerance policy.**
- Fingerprints must match exactly.
- Pixels may differ on at most **1% of the region** (`maxDiffPixelRatio: 0.01`) at a per-pixel `threshold` of 0.15, to absorb anti-aliasing.
- Do not raise these numbers. If a diff is intended, record it in `DECISIONS.md`, get approval, and add a narrowly scoped mask.

## 0.6 Gate runner `scripts/gate.mjs`
```js
import { execSync } from 'node:child_process';
const n = Number(process.argv[2]);
if (Number.isNaN(n)) { console.error('usage: pnpm gate <phase>'); process.exit(1); }
const run = (cmd, env = {}) => { console.log(`\n▶ ${cmd}`); execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } }); };
run('pnpm lint');
run('pnpm typecheck');
run('pnpm test');
if (n >= 3) run(`pnpm compliance --grep "@g[0-${Math.min(n, 9)}]\\b"`, { GATE: String(n) });
if (n >= 4) run(`pnpm e2e --grep "@g[0-${Math.min(n, 9)}]\\b"`, { GATE: String(n) });
console.log(`\n✅ Gate ${n} passed`);
```
Tag every e2e test title with its gate, e.g. `test('verifying six steps builds the employee @g5', …)`.

## 0.7 GitHub Actions `.github/workflows/ci.yml`

Railway's *Wait for CI* only sees workflows that run on `push`, so `push: main` is required.
```yaml
name: ci
on:
  push: { branches: [main] }
  pull_request:
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm i --frozen-lockfile
      - run: pnpm lint && pnpm typecheck && pnpm test

  goldens:   # proves goldens are exactly what the reference renders
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:vPIN-SAME-VERSION-noble
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable && pnpm i --frozen-lockfile
      - run: pnpm compliance:capture
      - run: git config --global --add safe.directory "$GITHUB_WORKSPACE" && git diff --exit-code -- compliance/goldens

  compliance:
    needs: quality
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:vPIN-SAME-VERSION-noble
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable && pnpm i --frozen-lockfile
      - run: pnpm compliance && pnpm e2e
      - if: failure()
        uses: actions/upload-artifact@v4
        with: { name: compliance-report, path: compliance/report }
```
Phase 07 adds an `api` job with a Postgres service.

**Branch protection on `main`:**
- Require a PR.
- Require the `quality`, `goldens`, `compliance` (and later `api`) checks.
- No direct pushes.

## 0.8 Railway project (Infrastructure as Code)

Railway's single-service `railway.json` / `railway.toml` config is deprecated. Manage the project with `.railway/railway.ts` and the CLI:
```bash
railway init            # create the project "amplified-impact-lms"
railway link
railway config init     # creates .railway/railway.ts
```

`.railway/railway.ts` (minimum for this phase; phase 09 completes it):
```ts
import { defineRailway, project, service, github } from 'railway/iac';

export default defineRailway(() => {
  const web = service('web', {
    source: github('YOUR_ORG/amplified-impact-lms', { branch: 'main' }),
    build: 'pnpm build',
    start: 'pnpm start',
    healthcheck: '/api/health',
    healthcheckTimeout: 60,
    env: { NODE_ENV: 'production' },
  });
  return project('amplified-impact-lms', { resources: [web] });
});
```
Then run `railway config plan`, review it, and run `railway config apply`. In the service settings, turn on **Wait for CI**, so Railway holds each `main` deployment until the GitHub Actions workflows on that commit pass and skips it if one fails.

---

## Gate 0: Ship Checklist

Automated (`pnpm gate 0`, and CI on the PR):
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass (empty test suites are allowed).
- [ ] `pnpm compliance:docker compliance:capture` writes `compliance/goldens/*.png|json` for **every** scenario. Running it a second time produces **zero** git diff.
- [ ] `compliance/tests/harness.spec.ts` passes. It opens each reference scenario and asserts there are no console errors, that `document.fonts.check('14px "Hanken Grotesk"')` is true, and that every region in `scenario.regions` exists:
```ts
import { test, expect } from '@playwright/test';
import { SCENARIOS } from '../lib/scenarios';
import { open } from '../lib/prepare';
import { REGION } from '../lib/regions';
for (const s of SCENARIOS) test(`reference renders ${s.id} @g0`, async ({ browser }) => {
  const { ctx, page } = await open(browser, s, 'reference');
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  expect(await page.evaluate(() => document.fonts.check('14px "Hanken Grotesk"'))).toBe(true);
  for (const r of s.regions ?? ['page', 'main']) if (REGION[r]) await expect(page.locator(REGION[r]!).first()).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});
```
- [ ] The CI `goldens` job is green.

Manual (record in the PR description):
- [ ] The Railway `web` service deploys from `main` and `GET /api/health` returns `{"ok":true}`.
- [ ] Wait for CI is on: a red commit does not deploy.
