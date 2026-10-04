# Phase 06: Admin Console Screens

**Goal.** Nine admin screens from SCREENS §4, each matching its reference. Changes made in admin must show up in the portal, and portal activity must show up in admin, with no reload in fixture mode (cross-tab) and through refetch or SSE in http mode.

**Ships when:** `pnpm gate 6` is green. That requires every `@g6` parity scenario and the cross-surface e2e tests below.

---

## 6.1 Build order and parity scenarios

| Screen | Route | SCREENS | Parity scenarios |
|---|---|---|---|
| Overview | `/admin` | §4.1 | `admin-overview`, `admin-overview-dark`, `admin-overview-laptop` |
| Curriculum | `/admin/curriculum` | §4.2 | `admin-curriculum` |
| Module Builder | `/admin/curriculum/:id`, `/new` | §4.3 | `admin-builder-marketing`, `admin-builder`, `admin-builder-locked` |
| Cohorts & Sessions | `/admin/cohorts` | §4.4 | `admin-cohorts`, `admin-cohorts-edit` |
| Learners & Teams | `/admin/learners` | §4.5 | `admin-learners`, `admin-learners-teams`, `admin-learner-drawer` |
| Resource Vault | `/admin/vault` | §4.6 | `admin-avault`, `admin-vault-upload` |
| Announcements | `/admin/announcements` | §4.7 | `admin-announce` |
| Tiers & Upgrades | `/admin/tiers` | §4.8 | `admin-tiers` |
| Staff & Roles | `/admin/staff` | §4.9 | `admin-staff` |

Use the same method as phase 05 (§5.1): logic class → `*.vm.ts` → markup → parity.

## 6.2 Analytics in fixture vs http mode

The reference's admin numbers include `db.base`: aggregates for 134 learners who are not modeled individually. All analytics VMs **must add `db.base`** exactly as the reference does. Examples:
- `learners = base.learners + users.filter(active).length`
- funnel `d = base.mod[id][0] + deployed(pool)`
- chart points `= base.daily[min(i, len−1)] + deployments before end of day i`

In http mode the API returns `base: ZERO_BASE`, so the same code shows live numbers. **Never branch on the data source inside a VM.**

## 6.3 Module Builder specifics
- The draft lives in local component state. It is seeded from `structuredClone(module)`, or from `blankModule(maxOrder + 1)` for `/new`. Switching routes resets it.
- The preview renders the real `EmployeeCard` from `cardVM(db, { tier: pvTier, progress: {}, cohortId: 'dec26' }, { ...draft, build: totalMins }, now)` and the real `LockedEmployeePreview` from the draft.
- There are always exactly 6 steps. There is no add-step or remove-step UI, only reorder.
- Saving a new draft navigates to `/admin/curriculum/:newId`.
- Leaving with unsaved changes asks `Discard unsaved changes?` through `useBlocker`. This is an approved addition; record it in DECISIONS.md.

## 6.4 Admin preview links
- **Fixture mode.** The Curriculum `eye` action switches persona, matching the prototype. Navigate to `/employees/:id?as=owner` for team-only employees and `?as=agent` otherwise.
- **http mode.** Open `/employees/:id` in a new tab. Staff may view the portal through a read-only "view as learner" session (phase 07, `POST /api/admin/impersonate`), which is audited.

---

## Gate 6: Ship Checklist

**Parity** (automated): `GATE=6 pnpm compliance`, with every scenario above green, including axe.

**Cross-surface e2e** (`compliance/tests/e2e/admin.spec.ts`, fixture build, two pages in **one** context so they share localStorage):
```ts
import { test, expect } from '@playwright/test';

async function pair(browser) {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', viewport: { width: 1440, height: 900 } });
  const admin = await ctx.newPage(); const learner = await ctx.newPage();
  for (const p of [admin, learner]) await p.clock.setFixedTime(new Date('2026-12-07T10:42:00-06:00'));
  return { ctx, admin, learner };
}

test('publishing a new AI Employee appears in the portal without reload @g6', async ({ browser }) => {
  const { admin, learner } = await pair(browser);
  await learner.goto('/?as=agent');
  await admin.goto('/admin/curriculum/new?as=admin');
  await admin.getByLabel('Name', { exact: true }).fill('Listing Coordinator AI Employee');
  await admin.getByLabel(/Outcome Line/).fill('Paste a listing → a coordinator checklist.');
  for (const [i, v] of ['Checklist', 'Vendor emails', 'Timeline'].entries()) await admin.getByPlaceholder('What it produces').nth(i).fill(v);
  for (let i = 0; i < 6; i++) await admin.getByRole('textbox', { name: `Step ${i + 1} title` }).fill(`Step ${i + 1}`);
  await admin.getByRole('button', { name: 'Publish' }).click();
  await expect(admin.getByText('Listing Coordinator AI Employee is live in the learner portal')).toBeVisible();
  await expect(learner.getByText('Listing Coordinator AI Employee')).toBeVisible();
});

test('builder blocks publishing incomplete drafts with exact messages @g6', async ({ browser }) => {
  const { admin } = await pair(browser);
  await admin.goto('/admin/curriculum/new?as=admin');
  await admin.getByRole('button', { name: 'Publish' }).click();
  for (const msg of ['Add the outcome line. Learners see it under the title.', 'Add all three outputs.'])
    await expect(admin.getByText(msg)).toBeVisible();
});

test('gating an employee to Team only locks it for agents @g6', async ({ browser }) => {
  const { admin, learner } = await pair(browser);
  await learner.goto('/?as=agent');
  await admin.goto('/admin/curriculum?as=admin');
  await admin.getByRole('button', { name: 'Team Only' }).nth(2).click(); // Database row
  await expect(learner.locator('aside[aria-label="Primary"]').getByRole('button', { name: /Database/ }).getByTitle('Team tier')).toBeVisible();
});

test('learner progress shows up in admin @g6', async ({ browser }) => {
  const { admin, learner } = await pair(browser);
  await admin.goto('/admin?as=admin');
  await learner.goto('/employees/sales?as=agent');
  while (await learner.getByRole('button', { name: 'Mark Verified' }).count()) await learner.getByRole('button', { name: 'Mark Verified' }).first().click();
  await expect(admin.getByText(/Jamie Ortiz\s*built Sales AI Employee/)).toBeVisible();
});

test('go live → end → publish replay flows to the portal @g6', async ({ browser }) => {
  const { admin, learner } = await pair(browser);
  await learner.goto('/?as=agent');
  await admin.goto('/admin/cohorts?as=admin');
  await admin.getByRole('button', { name: 'Go Live' }).click();
  await expect(learner.getByText('Live Now').first()).toBeVisible();
  await admin.getByRole('button', { name: 'End Session' }).click();
  await admin.getByRole('button', { name: 'Publish Replay' }).click();
  await expect(admin.getByText('Session 3 replay published to learners')).toBeVisible();
});

test('editing a session time moves the countdown and the banner @g6', async ({ browser }) => {
  const { admin, learner } = await pair(browser);
  await learner.goto('/?as=agent');
  await admin.goto('/admin/cohorts?as=admin');
  await admin.getByRole('button', { name: 'Edit' }).nth(2).click();
  await admin.getByLabel('Start Time (CT)').fill('15:00');
  await admin.getByRole('button', { name: 'Save Session' }).click();
  await expect(learner.getByText(/Wed, Dec 9 · 3:00 PM CT/).first()).toBeVisible();
});

test('announcement with warning severity renders as an alert banner @g6', async ({ browser }) => {
  const { admin, learner } = await pair(browser);
  await learner.goto('/?as=agent');
  await admin.goto('/admin/announcements?as=admin');
  await admin.getByLabel('Title').fill('Office hours moved to 2:00 PM');
  await admin.getByLabel('Message').fill('Same link as always.');
  await admin.getByRole('button', { name: 'Warning' }).click();
  await admin.getByRole('button', { name: 'Send Now' }).click();
  await expect(learner.getByRole('alert').getByText('Office hours moved to 2:00 PM')).toBeVisible();
});

test('converting an upgrade request unlocks team employees for that learner @g6', async ({ browser }) => {
  const { admin } = await pair(browser);
  await admin.goto('/admin/tiers?as=admin');
  await admin.getByRole('button', { name: 'Convert to Team' }).first().click();
  await expect(admin.getByText(/is on Team Tier\. All six AI Employees are unlocked in their portal\./)).toBeVisible();
});

test('permission matrix is enforced in the UI for the acting role @g6', async ({ browser }) => {
  const { admin } = await pair(browser);
  await admin.goto('/admin/staff?as=admin');
  // Owner column is fixed: clicking it does nothing
  const ownerCell = admin.getByRole('row', { name: /Publish modules/ }).getByRole('checkbox').first();
  await ownerCell.click(); await expect(ownerCell).toBeChecked();
});
```
**VM unit tests:** each admin `*.vm.ts` has explicit expectations at Week 2. Generate the expected values by running the reference module (`ref.seed('live')` and the same arithmetic) once, then hard-code them. For example, `Active Learners` = `base.learners` (134) + the 14 modeled active learners.
