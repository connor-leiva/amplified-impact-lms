# Phase 01: Design Foundations

**Goal.** Tokens, fonts, theme, accent, typeface, global CSS and the custom icon set are identical to the reference. Nothing product-specific is built yet.

**Ships when:** `pnpm gate 1` is green. That means the token parity and icon parity tests below pass, plus Gate 0.

---

## 1.1 Styling architecture (non-negotiable)

- **CSS Modules plus CSS custom properties.** No Tailwind, CSS-in-JS runtime or UI kit. The reference is built on inline styles over custom properties, and CSS Modules reproduce that 1:1 without a translation layer.
- Every color, shadow and font in a `.module.css` file is a `var(--token)` from `tokens.css`. A lint rule (§1.6) fails the build on raw hex, `rgb()` or named colors outside `tokens.css`.
- Spacing and radii are literal px values copied from the reference. They are not abstracted into a scale, so values can be compared 1:1 with the reference.

```
apps/web/src/styles/
  tokens.css      ← handoff-starter/tokens.css (verbatim, generated)
  global.css      ← handoff-starter/global.css (resets + keyframes, verbatim)
  fonts.ts        ← @fontsource imports
```

## 1.2 Copy the generated files

```bash
cp handoff-starter/tokens.css  apps/web/src/styles/tokens.css
cp handoff-starter/global.css  apps/web/src/styles/global.css
cp handoff-starter/icons.ts    packages/core/src/icons.ts
```

`tokens.css` defines:
- `:root` (light) and `:root[data-theme="dark"]`
- the accent overrides `:root[data-accent="indigo" | "plum"]`
- the typeface overrides `:root[data-font="instrument" | "schibsted"]`
- the responsive `--page-pad-x` / `--page-pad-top` media queries

`global.css` holds the body reset, link colors, scrollbar styling and the keyframes: `ai-confetti`, `ai-toast-in`, `ai-pulse`, `ai-pop`, `ai-fade`, `ai-skeleton`, `ai-spin`, `ai-drawer-in`.

Do not rename a single custom property. The parity test compares them by name.

## 1.3 Fonts (self-hosted, same families)

```bash
pnpm --filter @ai/web add @fontsource/hanken-grotesk @fontsource/dm-mono @fontsource/instrument-sans @fontsource/schibsted-grotesk
```

`apps/web/src/styles/fonts.ts`
```ts
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
// Alternate typefaces are loaded only when chosen (see prefs.ts)
export const loadAltFont = (font: 'instrument' | 'schibsted') =>
  font === 'instrument'
    ? Promise.all([400, 500, 600, 700].map((w) => import(`@fontsource/instrument-sans/${w}.css`)))
    : Promise.all([400, 500, 600, 700].map((w) => import(`@fontsource/schibsted-grotesk/${w}.css`)));
```

`apps/web/src/main.tsx` (imports, in this order):
```ts
import './styles/fonts';
import './styles/tokens.css';
import './styles/global.css';
```

## 1.4 Pre-paint theme script

Paste the snippet from `handoff-starter/index.head.html` into `apps/web/index.html` `<head>`, before the module script. It reads `localStorage['ai-lms-prefs']` and sets `data-theme`, `data-accent` and `data-font` on `<html>` before first paint, so there is no theme flash.
```html
<script>try{var p=JSON.parse(localStorage.getItem('ai-lms-prefs')||'{}'),d=document.documentElement;d.dataset.theme=p.theme==='dark'?'dark':'light';if(p.accent&&p.accent!=='pine')d.dataset.accent=p.accent;if(p.font&&p.font!=='hanken')d.dataset.font=p.font;}catch(e){}</script>
```

## 1.5 Preferences module (port of `loadPrefs` / `savePrefs` / `applyPrefs`)

`apps/web/src/lib/prefs.ts`
```ts
import { setViewerZone } from '@ai/core';
import { loadAltFont } from '../styles/fonts';

export const PREFS_KEY = 'ai-lms-prefs';
export type Prefs = {
  theme?: 'light' | 'dark';
  tz?: string | null;            // null/undefined = Auto
  sidebar?: 'full' | 'rail';
  accent?: 'pine' | 'indigo' | 'plum';
  font?: 'hanken' | 'instrument' | 'schibsted';
  phase?: 'week0' | 'live' | 'post'; // fixture/demo only
};

export const loadPrefs = (): Prefs => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') ?? {}; } catch { return {}; } };

export function applyPrefs(p: Prefs) {
  const d = document.documentElement;
  d.dataset.theme = p.theme === 'dark' ? 'dark' : 'light';
  if (p.accent && p.accent !== 'pine') d.dataset.accent = p.accent; else delete d.dataset.accent;
  if (p.font && p.font !== 'hanken') { d.dataset.font = p.font; void loadAltFont(p.font); } else delete d.dataset.font;
  setViewerZone(p.tz ?? null);
}

export function savePrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...loadPrefs(), ...patch };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch {}
  applyPrefs(next);
  window.dispatchEvent(new CustomEvent('ai-prefs', { detail: next }));
  return next;
}
```
Brand configuration (accent and typeface) is product configuration, not a user preference. Read it from `VITE_BRAND_ACCENT` and `VITE_BRAND_FONT` at boot and pass it to `applyPrefs`. The **default is `pine` + `hanken`**, which matches the reference.

## 1.6 Lint guard against raw colors

`eslint.config.js` (excerpt), plus a stylelint-free CSS check script:
```js
// scripts/check-css-colors.mjs: run in `pnpm lint`
import { globSync, readFileSync } from 'node:fs';
const bad = [];
for (const f of globSync('apps/web/src/**/*.module.css')) {
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(white|black|red|blue|gray|grey)\b/i.test(line) && !/var\(--/.test(line))
      bad.push(`${f}:${i + 1}  ${line.trim()}`);
  });
}
if (bad.length) { console.error('Raw colors are not allowed. Use tokens from tokens.css:\n' + bad.join('\n')); process.exit(1); }
```
Also forbid `import … from 'lucide-react' | 'react-icons' | '@heroicons/*'` with `no-restricted-imports`.

## 1.7 Icon component

`apps/web/src/components/Icon.tsx`
```tsx
import { ICONS, type IconName } from '@ai/core';

export function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.8, label, className }: {
  name: IconName; size?: number; color?: string; strokeWidth?: number; label?: string; className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      style={{ flex: 'none', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <path d={ICONS[name]} />
    </svg>
  );
}
```
Exceptions where the reference *fills* the glyph: `play` in buttons and on the poster, and `pause`. For those, pass `fill="currentColor" stroke="none"`. Expose `filled?: boolean` on `Icon` for this.

## 1.8 Foundations specimen route (dev and test only)

Add `/__tokens`, which renders the six type steps and every semantic swatch. It is a debugging aid. The gate tests below do not depend on it.

---

## Gate 1: Ship Checklist

**Token parity** (`compliance/tests/e2e/tokens.spec.ts`). Every custom property resolves to the same computed value in the reference and in the app, for each theme × accent × typeface combination that ships.
```ts
import { test, expect } from '@playwright/test';
import { REF_BASE, APP_BASE } from '../../lib/prepare';

const COMBOS = [
  { theme: 'light' }, { theme: 'dark' },
  { theme: 'light', accent: 'indigo' }, { theme: 'light', accent: 'plum' },
  { theme: 'dark', accent: 'indigo' }, { theme: 'light', font: 'schibsted' },
];

async function readTokens(page, url, prefs) {
  await page.addInitScript((p) => localStorage.setItem('ai-lms-prefs', JSON.stringify(p)), prefs);
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  return page.evaluate(() => {
    const names = new Set<string>();
    for (const sheet of [...document.styleSheets]) {
      let rules: CSSRuleList; try { rules = sheet.cssRules; } catch { continue; }
      for (const r of [...rules]) if (r instanceof CSSStyleRule && r.selectorText.startsWith(':root'))
        for (const p of [...r.style]) if (p.startsWith('--')) names.add(p);
    }
    const cs = getComputedStyle(document.documentElement);
    return Object.fromEntries([...names].sort().map((n) => [n, cs.getPropertyValue(n).trim()]));
  });
}

for (const prefs of COMBOS) test(`tokens match reference ${JSON.stringify(prefs)} @g1`, async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const ref = await readTokens(a, `${REF_BASE}/${encodeURIComponent('Status Token.dc.html')}`, prefs);
  const app = await readTokens(b, `${APP_BASE}/__tokens`, prefs);
  expect(Object.keys(ref).length).toBeGreaterThan(80);
  expect(app).toEqual(ref);
});
```

**Icon parity** (`packages/core/src/icons.test.ts`).
```ts
import { describe, it, expect } from 'vitest';
import { ICONS, MODULE_ICONS } from './icons';
import * as ref from '../../../design-reference/lms-data.js';

describe('icons @g1', () => {
  it('has exactly the reference icon set', () => expect(ICONS).toEqual(ref.ICONS));
  it('has the same 12 module icons', () => expect([...MODULE_ICONS]).toEqual(ref.MODULE_ICONS));
});
```

**Body typography** (in `tokens.spec.ts`). The `body` computed font-family starts with `Hanken Grotesk`, at font-size `14px` and line-height `20.3px`, in both the reference and the app.

**Lint.** `scripts/check-css-colors.mjs` passes, and no icon library is installed (`pnpm why lucide-react` returns nothing).
