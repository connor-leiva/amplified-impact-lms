# Phase 03: Component Library and the `/__states` Sheet

**Goal.** Build the shared primitives and the seven product components, then render them on `/__states` so that page matches `design-reference/States.dc.html` in light and dark.

**Ships when:** `pnpm gate 3` is green. That requires the `states-light` and `states-dark` parity scenarios (pixels + fingerprint + axe) and the component unit tests.

---

## 3.1 Folder and conventions

```
apps/web/src/components/
  primitives/   Button.tsx IconButton.tsx Segmented.tsx Field.tsx (Input/Textarea/Select) Switch.tsx
                Avatar.tsx Card.tsx Drawer.tsx Modal.tsx Popover.tsx Tabs.tsx Chip.tsx Skeleton.tsx Toaster.tsx
  StatusToken.tsx  NavItem.tsx  JoinButton.tsx  SessionCard.tsx  EmployeeCard.tsx
  AnnouncementBanner.tsx  LockedEmployeePreview.tsx  Icon.tsx  BrandSlot.tsx
```
- Each component has a `*.module.css` file. Values are copied from the matching reference file's inline styles. For example, `Status Token.dc.html` → `StatusToken.module.css`.
- Each product component accepts `force?: 'hover' | 'focus' | 'disabled' | 'loading'`, which applies the state statically for the States sheet. Implement it with a `data-force` attribute and CSS selectors such as `.root:hover, .root[data-force="hover"] { … }`. Do not duplicate markup to show a forced state.
- Props match SCREENS §5 exactly. View-models (`sessionVM`, `cardVM`) come from `@ai/core`. **Components never compute business state**; they only render a VM.

## 3.2 Primitives (must match SCREENS §1)

`Button.tsx`
```tsx
import clsx from 'clsx';
import s from './Button.module.css';
import { Icon } from '../Icon';
import type { IconName } from '@ai/core';

type Variant = 'primary' | 'secondary' | 'ghost' | 'link' | 'destructive';
type Size = 'sm' | 'md' | 'lg';
export function Button({ variant = 'secondary', size = 'md', icon, iconRight, disabled, children, className, ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: IconName; iconRight?: IconName }) {
  return (
    <button {...rest} aria-disabled={disabled || undefined} onClick={disabled ? undefined : rest.onClick}
      className={clsx(s.btn, s[variant], s[size], disabled && s.disabled, className)}>
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 15} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={14} />}
    </button>
  );
}
```
`Button.module.css`
```css
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px;
  border: 1px solid transparent; font-weight: 600; white-space: nowrap; cursor: pointer; outline: none; transition: background 120ms; }
.btn:focus-visible { box-shadow: 0 0 0 3px var(--focus-ring); }
.sm { height: 32px; padding: 0 12px; font-size: 13px; }
.md { height: 36px; padding: 0 14px; font-size: 14px; }
.lg { height: 40px; padding: 0 16px; font-size: 14px; }
.primary { background: var(--action-primary); color: var(--action-on-primary); }
.primary:hover { background: var(--action-primary-hover); }
.secondary { background: var(--action-secondary); color: var(--text-primary); border-color: var(--action-secondary-line); font-weight: 500; }
.secondary:hover { background: var(--action-secondary-hover); }
.ghost { background: transparent; color: var(--text-secondary); font-weight: 500; font-size: 13px; }
.ghost:hover { background: var(--bg-hover); color: var(--text-primary); }
.link { background: none; border: 0; padding: 0; height: auto; color: var(--text-link); font-weight: 500; }
.link:hover { color: var(--text-link-hover); }
.destructive { background: transparent; color: var(--status-attention-text); border-color: var(--line-strong); font-weight: 500; }
.destructive:hover { background: var(--status-attention-bg); }
.disabled, .disabled:hover { background: var(--action-secondary); color: var(--text-disabled); border-color: var(--line-default); cursor: not-allowed; }
```
Buttons in the reference vary heights between 30, 32, 34, 36, 38, 40 and 42. Pass `style={{ height }}` or a `size` per call site to match exactly. **Never "normalize" a height**, because the pixel diff will fail.

`Segmented.tsx` follows SCREENS §1.4 (`role="group"`, options `aria-pressed`). `Drawer.tsx` follows SCREENS §1.6 (`data-drawer="open"` when open, focus trap, Esc). `Modal.tsx` follows §1.7. `Toaster.tsx` follows §1.10 and exposes `toast(msg, tone)` through context.

## 3.3 StatusToken (port exactly)

```tsx
import s from './StatusToken.module.css';
type Kind = 'access' | 'build' | 'runtime' | 'step' | 'custom';
type Tone = 'success' | 'progress' | 'neutral' | 'attention' | 'locked' | 'accent' | 'live';
type Glyph = 'check' | 'ring' | 'pie' | 'lock' | 'signal' | 'pause' | 'alert' | 'minus' | 'clock' | 'dot' | 'info';

const O = 'M8 1.75a6.25 6.25 0 1 0 0 12.5a6.25 6.25 0 1 0 0-12.5';
const pie = (n: number, total: number) => {
  if (n >= total) return 'M8 4.4a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 1 0 0-7.2';
  if (!n) return '';
  const a = (2 * Math.PI * n) / total, x = (8 + 3.6 * Math.sin(a)).toFixed(2), y = (8 - 3.6 * Math.cos(a)).toFixed(2);
  return `M8 8L8 4.4A3.6 3.6 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y}Z`;
};
const GLYPH: Record<Exclude<Glyph, 'pie'>, [stroke: string, fill: string]> = {
  check: [O + 'M5.4 8.3l1.8 1.8 3.5-3.7', ''],
  ring: [O, ''],
  lock: ['M4.5 7.5h7a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM5.75 7.5V5.6a2.25 2.25 0 0 1 4.5 0v1.9', ''],
  signal: ['M4.3 4.3a5.2 5.2 0 0 0 0 7.4M11.7 4.3a5.2 5.2 0 0 1 0 7.4', 'M8 5.8a2.2 2.2 0 1 0 0 4.4a2.2 2.2 0 1 0 0-4.4'],
  pause: [O + 'M6.6 5.9v4.2M9.4 5.9v4.2', ''],
  alert: ['M8 2.2l6.2 11H1.8zM8 6.4v3.1', 'M8 10.5a.85.85 0 1 0 0 1.7a.85.85 0 1 0 0-1.7'],
  minus: [O + 'M5.5 8h5', ''],
  clock: [O + 'M8 4.9V8l2.1 1.4', ''],
  dot: ['', 'M8 4.8a3.2 3.2 0 1 0 0 6.4a3.2 3.2 0 1 0 0-6.4'],
  info: [O + 'M8 7.4v3.6', 'M8 4.6a.85.85 0 1 0 0 1.7a.85.85 0 1 0 0-1.7'],
};
// Resolve (label, short, tone, glyph, tooltip) from kind/state exactly as the table in SCREENS §5.1,
// then render: <span class=pill data-tone data-compact data-size title> {live ? <i class=pulse/> : <svg 16 viewBox>} <span>{label}</span></span>
```
Copy the CSS from `Status Token.dc.html` (pill 22/26 high, gap 5, 12/500 or 13, compact 16 high, no background or border). Tones map to `--{tone}-text | -bg | -line` (locked → `--access-locked-*`, accent → `--text-link` / `--action-primary-tint` / `--action-primary-line`, live → success with the pulsing dot).

## 3.4 NavItem, JoinButton

Port `Nav Item.dc.html` and `Join Button.dc.html` line by line. Both are short. Key contracts:
- `NavItem` renders a `<button>` with `aria-current="page"` when active, and `title` = tooltip. Hover and active colors come from the `--nav-hover` and `--nav-active` CSS variables set by the parent `aside`. A compact `StatusToken` appears only when expanded, not locked and not busy.
- `JoinButton` uses `aria-disabled` and `pointer-events: none` when disabled. It is the only element that may open a Zoom URL. Its `onJoin` resolves the URL at click time (phase 08 makes the server reveal it), so the URL is never in the DOM before the join window.

## 3.5 SessionCard

```tsx
export function SessionCard({ vm, onJoin, onCal, onWatch, onKit }: {
  vm: SessionVM; onJoin(): void; onCal(kind: 'google' | 'outlook' | 'ics'): void; onWatch(): void; onKit(): void;
}) {
  const [calOpen, setCalOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const join = () => { setJoining(true); setTimeout(() => { setJoining(false); onJoin(); }, 900); };
  return (
    <section aria-label={`${vm.kicker}: Session ${vm.n}`} className={s.card}>
      <div className={s.left}>
        <div className={s.kickerRow}>
          {vm.live && <span className={s.liveBadge}><i className={s.pulse} />LIVE</span>}
          <span className={s.kicker}>{vm.kicker}</span>
          {vm.live && <span role="timer" aria-live="off" className={s.elapsed}>{vm.elapsed} Elapsed</span>}
        </div>
        <div className={s.title}>Session {vm.n} · {vm.title}</div>
        <div className={s.meta}><span>{vm.module}</span><span>{vm.when}</span><span>{vm.mins} Min with {vm.instructor}</span></div>
        {vm.note && <div className={s.note}><Icon name={vm.variant === 'ended_processing' ? 'clock' : 'checkCircle'} size={15} />{vm.note}</div>}
      </div>
      {vm.countdown?.length ? (
        <>
          <div role="timer" aria-live="off" aria-label={vm.aria} className={s.countdown}>
            {vm.countdown.map((u) => <div key={u.l} className={s.unit}><div className={s.digits}>{u.v}</div><div className={s.unitLabel}>{u.l}</div></div>)}
          </div>
          <span aria-live="polite" className="sr-only">{vm.aria}</span>
        </>
      ) : null}
      <div className={s.actions}>
        {vm.primary === 'calendar' && <CalendarMenu open={calOpen} onToggle={() => setCalOpen((o) => !o)} onPick={(k) => { setCalOpen(false); onCal(k); }} />}
        {vm.join && <JoinButton mode={joining ? 'loading' : vm.join} hint={vm.hint} stack onJoin={join} />}
        {vm.primary === 'watch' && <Button variant="primary" icon="play" onClick={onWatch}>Watch Replay</Button>}
        {vm.primary === 'kit' && <Button onClick={onKit}>Open the Build Kit</Button>}
      </div>
    </section>
  );
}
```
The calendar menu items are `Google Calendar` / `New tab`, `Outlook` / `New tab` and `Apple or Other` / `.ics file`, at `role="menu"` with width 220. Google and Outlook open deep links built from `sessionEvent(s)`. ICS downloads `ics([sessionEvent(s)])`.

## 3.6 EmployeeCard, AnnouncementBanner, LockedEmployeePreview

Port from their reference files using SCREENS §5.5 to §5.7. EmployeeCard renders `cardVM`. In the progress bar, each of the 6 segments is `--status-success` when built, `--status-progress` when verified but not yet built, and `--track` otherwise.

## 3.7 The `/__states` route

`apps/web/src/routes/__states.tsx` reproduces `States.dc.html` exactly:
- padding 48, gap 56, `min-width: max-content`
- section headings 20/600 with 13 tertiary captions
- a variants row of 5 × 520 px cards
- a states grid `150px repeat(5, 300px)`, gap 20
- the nav-variant tiles: 248 px wide (64 for the rail), padding 10, radius 12, `--bg-sidebar`

Data:
```ts
const db = seed('live');
const s3 = db.sessions.find((s) => s.id === 'dec26-s3')!;
const variants = VARIANTS.map(([id]) => ({ id, vm: sessionVM(db, s3, id, variantNow(s3, id, 0)) }));
const card = cardVM(db, db.users.find((u) => u.id === 'u_jamie')!, db.modules.find((m) => m.id === 'sales')!, phaseNow('live'));
```
The banner title is ``Session 3 moved to ${fmt.dayPlain(s3.start)} · ${fmt.time(s3.start)}``. The route mounts only when `import.meta.env.DEV || import.meta.env.VITE_ENABLE_STATES === 'true'`. It sets `data-app-ready="true"` on `<body>` after fonts load.

---

## Gate 3: Ship Checklist

**Parity** (automated): `GATE=3 pnpm compliance` runs `states-light` and `states-dark`. The pixel diff must be ≤ 1% and the fingerprint must match exactly. The scenarios also run axe with no serious or critical violations.

**Unit tests** (`apps/web/src/components/*.test.tsx`, Vitest + Testing Library):
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusToken } from './StatusToken';
import { JoinButton } from './JoinButton';
import { NavItem } from './NavItem';

test('build token shows label + tooltip, never color alone @g3', () => {
  render(<StatusToken kind="build" state="in_progress" n={3} total={6} />);
  expect(screen.getByText('3 of 6 Steps')).toBeInTheDocument();
  expect(screen.getByTitle('In progress · 3 of 6 steps verified')).toBeInTheDocument();
});
test('compact build token uses short label @g3', () => {
  render(<StatusToken kind="build" state="in_progress" n={3} total={6} compact />);
  expect(screen.getByText('3/6')).toBeInTheDocument();
});
test('disabled join button cannot fire and explains why @g3', async () => {
  const onJoin = vi.fn();
  render(<JoinButton mode="disabled" hint="Opens 15 Min Before" onJoin={onJoin} />);
  const btn = screen.getByRole('button', { name: 'Join Session' });
  expect(btn).toHaveAttribute('aria-disabled', 'true');
  await userEvent.click(btn).catch(() => {});
  expect(onJoin).not.toHaveBeenCalled();
  expect(screen.getByText('Opens 15 Min Before')).toBeVisible();
});
test('active nav item is the current page @g3', () => {
  render(<NavItem label="Dashboard" icon="grid" active onClick={() => {}} />);
  expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
});
test('locked nav item shows Team tier tooltip @g3', () => {
  render(<NavItem label="Meetings" icon="mic" locked depth={1} onClick={() => {}} />);
  expect(screen.getByTitle('Team tier')).toBeInTheDocument();
});
```
Add tests for:
- the SessionCard countdown: seconds hidden when more than an hour remains, `role="timer"`, and the polite region text equal to `vm.aria`
- each SessionCard variant's primary action
- the EmployeeCard CTA label per state and Enter-key activation
- the banner roles (`alert` for warning, `status` for info)
- LockedEmployeePreview tabs (`aria-selected`) and `See Team Tier` calling `onCta`
