# Phase 05: Learner Portal Screens

**Goal.** Six learner screens, built from SCREENS §3, each matching its reference:
- Dashboard
- Employee detail
- Sessions
- Team Hub
- Resource Vault
- Team Tier

**Ships when:** `pnpm gate 5` is green. That requires every `@g5` parity scenario (27 of them) and the e2e behaviors below, all in the fixture build.

---

## 5.1 How to build each screen

1. Open the reference in a browser at `http://localhost:4400/Amplified%20Impact%20LMS.dc.html#agent/<screen>` with the reference server running (`pnpm reference`), and keep it next to your app.
2. Read the screen's logic class (the `<script type="text/x-dc">` block in `design-reference/Portal *.dc.html`). Its `renderVals()` is the view-model.
3. Move that logic into a **pure** function `apps/web/src/routes/portal/<screen>.vm.ts`: `(db, user, now, ui) → VM`. Unit-test it.
4. Write the component as markup only, rendering the VM, with styles in `<screen>.module.css` copied from the reference template's inline styles.
5. Run `GATE=5 pnpm compliance --grep <scenario-id>` and fix until the pixels and the fingerprint pass.

Example:

`routes/portal/dashboard.vm.ts` (excerpt)
```ts
export function dashboardVM(db: Db, user: Learner, team: Team | null, now: number, forceVariant?: Variant) {
  const vis = visibleModules(db), acc = vis.filter((m) => canAccess(user, m));
  const subline = user.tier === 'team'
    ? `${team ? team.name + ' · ' : ''}Team Tier`
    : `Agent Tier · ${acc.map((m) => m.short).join(', ').replace(/, ([^,]*)$/, ' and $1')} Included`;
  const aud = (a: Announcement) => a.audience === 'all' || a.audience === user.tier || (a.audience === 'owners' && user.role === 'Team Owner');
  const ann = db.announcements.find((x) => x.status === 'sent' && x.channels.includes('inapp') && aud(x) && !db.dismissed[`${user.id}:${x.id}`]);
  const { s, variant } = cardSession(db, user, now);
  const built = acc.filter((m) => buildOf(user, m).state === 'verified').length;
  return {
    subline, ann, session: s && variant !== 'none' ? sessionVM(db, s, variant, now) : null,
    progress: { done: built, total: acc.length, segs: acc.map((m) => ({ m, ...buildOf(user, m) })) },
    cards: vis.map((m) => cardVM(db, user, m, now)),
    /* …quick links, schedule, week0 / post-cohort blocks */
  };
}
```

## 5.2 Screen checklist

Build these in order. Each line lists the parity scenarios that must pass.

| Screen | Route | SCREENS | Parity scenarios |
|---|---|---|---|
| Dashboard | `/` | §3.1 | `dash-agent-live`, `dash-agent-week0`, `dash-agent-post`, `dash-owner-live`, `dash-agent-eastern`, `dash-agent-dark`, `dash-agent-laptop`, `dash-agent-mobile` |
| Employee detail | `/employees/:id` | §3.2 | `emp-agent-marketing`, `emp-agent-sales`, `emp-agent-database`, `emp-owner-meetings`, `emp-agent-marketing-transcript`, `emp-agent-marketing-checklist`, `emp-agent-marketing-prompt`, `emp-agent-laptop`, `emp-agent-mobile` |
| Sessions | `/sessions` | §3.3 | `sessions-agent`, `sessions-owner-eastern` |
| Team Hub | `/team` | §3.4 | `team-owner`, `team-owner-invite`, `team-owner-member` |
| Resource Vault | `/vault` | §3.5 | `vault-agent`, `vault-agent-exec`, `vault-owner-exec` |
| Team Tier | `/team-tier` | §3.6 | `tier-agent` |

### Employee detail: implementation notes
- **Player.** Phase 08 integrates the real video provider. For now, render the poster and controls from SCREENS §3.2 with a stubbed `<VideoEngine>` that advances `t` at 4 Hz × speed while playing. The reference does exactly this, so it can be compared deterministically. Captions come from `transcript` lines where `t − line[0] < 30`.
- **Chapter rail.** The chapters **are** `checklist[i].t`. There is no separate chapter list. `seek(t, play)` also scrolls `main` back to the player when the page is scrolled more than 120 px.
- **Position persistence.** Write `localStorage['ai-lms-pos-' + id]` every 20 ticks (5 s) and on unmount. Read it on mount, capped at `dur`.
- **Drawers.** The prompt and file viewer and the Run drawer from SCREENS §3.2. The Run drawer's 1400 ms delay is part of the spec, and it writes `lastRun` with `recordRun`.
- **Built moment.** The 6th `toggleStep` returns the `confetti` effect and the built toast. `useMutate` handles both.

## 5.3 Copy guardrails
- All copy comes from the VM or JSX literals copied from the reference. Do not paraphrase.
- Search the reference for each string before writing it. If you cannot find it, it is probably computed in the logic class.
- The fingerprint test catches case and spelling drift (`Min Build` vs `min build`), so trust its diff.

---

## Gate 5: Ship Checklist

**Parity** (automated): `GATE=5 pnpm compliance`. Every scenario in the table must be green, with axe passing on each.

**E2E behaviors** (`compliance/tests/e2e/portal.spec.ts`, fixture build, `@g5`). Each must pass:

```ts
import { test, expect } from '@playwright/test';
import { open } from '../../lib/prepare';
const agent = { id: 'e', gate: 5, role: 'agent', ref: '', path: '/' } as const;

test('verifying all six Sales steps builds it, celebrates, and unlocks deploy @g5', async ({ browser }) => {
  const { page } = await open(browser, { ...agent, path: '/employees/sales' }, 'app');
  const checklist = page.getByRole('region', { name: 'Build checklist' }).or(page.locator('[aria-label="Build checklist"]'));
  while (await checklist.getByRole('button', { name: 'Mark Verified' }).count()) await checklist.getByRole('button', { name: 'Mark Verified' }).first().click();
  await expect(checklist.getByText('6 of 6 Steps Verified')).toBeVisible();
  await expect(page.getByText('Sales AI Employee is built. Deploy it from the card on the right.')).toBeVisible();
  await page.getByRole('button', { name: 'Mark as Deployed' }).click();
  await expect(page.getByText('Sales AI Employee deployed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run on a Lead' })).toBeVisible();
  await page.goto('/?as=agent'); // dashboard reflects it
  await expect(page.getByText('2 of 3', { exact: true })).toBeVisible();
});

test('deployed checklist is locked @g5', async ({ browser }) => {
  const { page } = await open(browser, { ...agent, path: '/employees/marketing' }, 'app');
  await page.locator('[aria-label="Build checklist"] li').first().getByTitle(/Deployed AI Employees keep their checklist/).click();
  await expect(page.getByText('This AI Employee is deployed, so its checklist is locked.')).toBeVisible();
});

test('pause, resume and run @g5', async ({ browser }) => {
  const { page } = await open(browser, { ...agent, path: '/employees/marketing' }, 'app');
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('Paused. It won’t pick up new work until you resume it.')).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Run on a Listing' }).click();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByText('Marketing AI Employee Is Working…')).toBeVisible();
  await expect(page.getByText('Compliance check')).toBeVisible({ timeout: 3000 });
});

test('transcript search highlights and seeks @g5', async ({ browser }) => {
  const { page } = await open(browser, { ...agent, path: '/employees/marketing' }, 'app');
  await page.getByRole('button', { name: 'Transcript' }).click();
  await page.getByLabel('Search the transcript').fill('compliance');
  await expect(page.getByText(/\d+ match(es)?/)).toBeVisible();
  await page.getByRole('button', { name: /^40:40/ }).click();
  await expect(page.getByText(/40:4\d \/ 58:24/)).toBeVisible();
});

test('chapter click seeks to the step timestamp @g5', async ({ browser }) => {
  const { page } = await open(browser, { ...agent, path: '/employees/marketing' }, 'app');
  await page.getByRole('button', { name: /Step 5 · 32:15/ }).click();
  await expect(page.getByText(/32:1\d \/ 58:24/)).toBeVisible();
});

test('join button respects the 15-minute window @g5', async ({ browser }) => {
  // Session 3 = 2026-12-09 13:00 CT
  for (const [iso, expected] of [['2026-12-09T12:44:00-06:00', 'disabled'], ['2026-12-09T12:46:00-06:00', 'Join Session'], ['2026-12-09T13:05:00-06:00', 'Join Now']] as const) {
    const ctx = await browser.newContext({ timezoneId: 'America/Chicago' }); const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(iso));
    await page.goto(`/sessions?as=agent&phase=live&now=${encodeURIComponent(iso)}`); // fixture clock honors ?now=
    const btn = page.getByRole('button', { name: /Join (Session|Now)/ }).first();
    if (expected === 'disabled') await expect(btn).toHaveAttribute('aria-disabled', 'true');
    else await expect(btn).toHaveText(new RegExp(expected));
    await ctx.close();
  }
});

test('eastern viewer sees dual time everywhere @g5', async ({ browser }) => {
  const { page } = await open(browser, { ...agent, tz: 'America/New_York', path: '/sessions' }, 'app');
  await expect(page.getByText(/Wed, Dec 9 · 2:00 PM ET \(1:00 PM CT\)/).first()).toBeVisible();
});

test('calendar downloads a valid ICS @g5', async ({ browser }) => {
  const { page } = await open(browser, { ...agent, path: '/sessions' }, 'app');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Add All Sessions to Calendar' }).click()]);
  const text = await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c).toString());
  expect(text).toMatch(/^BEGIN:VCALENDAR/); expect((text.match(/BEGIN:VEVENT/g) ?? []).length).toBe(3);
});

test('banner dismissal persists @g5', async ({ browser }) => {
  const { page } = await open(browser, agent, 'app');
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await page.reload();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('upgrade request round-trips to admin @g5', async ({ browser }) => {
  const { page } = await open(browser, { ...agent, path: '/team-tier' }, 'app');
  await page.getByRole('button', { name: 'Book Upgrade Consultation' }).click();
  await expect(page.getByRole('button', { name: 'Consultation Requested' })).toBeVisible();
  await page.goto('/admin/tiers?as=admin');
  await expect(page.getByText('Jamie Ortiz')).toBeVisible();
});

test('team invite validates exactly like the mockup @g5', async ({ browser }) => {
  const { page } = await open(browser, { ...agent, role: 'owner', path: '/team' }, 'app');
  await page.getByRole('button', { name: 'Invite Member' }).click();
  await page.getByLabel('Work Email').fill('nope');
  await page.getByRole('button', { name: 'Send Invite' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await page.getByLabel('Work Email').fill('priya@northlinerealty.com');
  await page.getByRole('button', { name: 'Send Invite' }).click();
  await expect(page.getByText('That person is already on your team.')).toBeVisible();
  await page.getByLabel('Work Email').fill('new.person@northlinerealty.com');
  await page.getByRole('button', { name: 'Send Invite' }).click();
  await expect(page.getByText('Invite sent to new.person@northlinerealty.com')).toBeVisible(); // fills seat 7 of 7
  await page.getByRole('button', { name: 'Invite Member' }).click();
  await page.getByLabel('Work Email').fill('another@northlinerealty.com');
  await page.getByRole('button', { name: 'Send Invite' }).click();
  await expect(page.getByText('All seats are assigned. Remove a seat or contact us to add more.')).toBeVisible();
});

test('agent tier cannot open team-only employees or the executive vault @g5', async ({ browser }) => {
  const { page } = await open(browser, { ...agent, path: '/employees/finance' }, 'app');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.goto('/vault?as=agent&tab=executive');
  await expect(page.getByRole('button', { name: /Book Upgrade Consultation|Consultation Requested/ })).toBeVisible();
});

test('playback position is restored @g5', async ({ browser }) => {
  const { page } = await open(browser, { ...agent, path: '/employees/marketing' }, 'app');
  await page.getByRole('button', { name: /Step 3/ }).click();
  await page.goto('/?as=agent'); await page.goto('/employees/marketing?as=agent');
  await expect(page.getByText(/18:4\d \/ 58:24/)).toBeVisible();
});
```

Timestamps such as `32:15` and `40:40` come from the seed's `checklist[i].t` and `transcript`. If you change the seed, change the tests in the same PR.

**VM unit tests:** each `*.vm.ts` has tests with explicit expectations for Jamie and Alex in the Week 0, Week 2 and After Cohort phases. For example, the Week 0 dashboard has no `Next Up` and includes the orientation row.
