# Admin redesign, round 2: design notes

**Files**
- `AdminRedesign.jsx`: the mockup. One file, `import React` and `export default`.
- `Admin Redesign.dc.html` and `preview/AdminRedesign.preview.jsx`: a preview wrapper and a generated copy of the same code without the import/export lines. Regenerate the copy after editing the main file.
- Round 1 files (`AdminConsole.jsx`, `Admin Console - Design notes.md`) are kept for reference.

**Not done as asked**
- Built directly as React, not on Fable 5.2.
- The wordmark is the supplied lockup (`amplified-impact-wordmark.svg`): its outlined path and ring-and-dot tittle are embedded verbatim (ink #0A0D0C, tittle #1F8A5C). The 64px rail crops the same artwork to its first glyph.
- Module Builder was designed without a screenshot of the live page. Check it against the real fields.

## Mockup controls (dark bar, not product UI)
Width 1440 / 1280 / 1024 / 390 · screen picker · data state (default, loading, empty, error) · role (Owner, Admin, Support) · cohort (Week 2, before start) · masquerade toggle · ⌘K.

## Type scale

| Role | Desktop (≥768) | Phone (≤767) |
|---|---|---|
| Page title | 26/32, 600, -0.02em | 24/30 |
| Section head | 15/22, 600 | 17/22 |
| Body, table text | 14/20 | 16/24 |
| Controls, nav, tabs | 13, 500 | 16 |
| Meta, table headers | 12/16, muted | 16/22, muted |
| Mono (IDs, SHAs, SQL, endpoints) | Geist Mono 13 | 16 |
| KPI figure | 24/32, 600, tabular | same |

Money and counts use Geist with tabular figures, right-aligned. Mono is kept for identifiers.

## Spacing and radius tokens
- 4px grid. Steps in use: 4, 8, 12, 16, 20, 24, 32.
- Page: max width 1400, padding 32 (24 at 1024, 16 on phone), 20 between blocks.
- Radius: 8 controls, menus 10, 12 cards and modals, pills fully round.
- Borders: hairline #E6E3DA, control border #D3CFC3.
- Shadow: cards 0 1px 2px at 3%; menus and modals only get a real shadow.
- Colour: cream #F4F2EC canvas, white surfaces, ink #15211D, Forest #1F4D40 for primary actions and active nav, Mint #6FD3A5 for the wordmark dot, focus glow and success ticks only. Status hues (green, blue, amber, red) appear as 7px dots or soft pills.

## Desktop vs phone sizing
- Desktop: rows 52, controls 32, page-header buttons 36, nav items 32, pills 22.
- Phone: controls 44, primary 48, pills 28, everything 16px or larger.
- The switch is one class on the frame (`.ph`) that changes CSS variables. Nothing phone-sized can leak to desktop.
- 1440 and 1280: every column stays. Tracks tighten at 1280; nothing is dropped.
- 1024: sidebar starts as a 64px rail with one icon per group, each opening a flyout of its pages. Lower-priority columns (marked `hide: 'lap'`) drop only if the table does not fit, and their value folds into another cell (session under the module name, owner under the workspace, role under the user).
- 390: tables become stacked cards with label/value pairs; tabs become one select; sidebar is a drawer. Reordering moves into the "…" menu. Curriculum has its own card: title, two-line description, one meta line, then status, tier and actions on a row. KPI tiles are 2-up with short labels; a fifth tile spans the row. No hyphenation anywhere.
- Key-facts strips reflow by whole items and never wrap a value.

## Component inventory

| Component | States |
|---|---|
| Sidebar | expanded 244, rail 64, drawer; groups open/closed (active group always open, closed groups show only a real alert count, e.g. Operations · 1 incident) |
| Cohort switcher | closed, open menu, rail tile |
| Button | secondary, primary, quiet, danger, disabled, locked (lock icon) |
| Icon button | rest, hover, focus |
| Input, select, search field | rest, hover, focus, inline-edit (borderless until hover) |
| Status dot | ok, info, running (ring), warn, bad, off (hollow) |
| Pill | neutral, ok, info, warn, bad; button variant with chevron (tier access) |
| Table | default, hover, selected, sorted, dragging, drop target, loading skeleton, empty, no matches, error, phone cards |
| Row actions | hover-revealed icons, always-visible primary, "…" menu, disabled item with lock |
| Card, key-facts strip, key/value list, timeline, progress bar (1 or 2 segments, amber at 90% and up; neutral grey when a fixed-seat plan is full) | — |
| Stat card | static, clickable |
| Tabs | underline with counts; select on phone |
| Modal | confirm, confirm with reason, locked reason (masquerade), detail |
| Command palette | results, active row, no results |
| Masquerade banner | running, max reached |
| Toast, empty state, error state, 404, access denied | — |

Focus: 2px white gap plus 2px Forest ring on controls; inputs get a Forest border and a soft mint glow. One icon set, 24 grid, 1.75 stroke, round caps, drawn at 16.

## Borrowed from
- **Linear:** 13–14px UI type with 12px muted meta, collapsible sidebar groups, the workspace switcher at the top of the sidebar, hairlines instead of heavy cards, ⌘K.
- **Stripe Dashboard:** detail pages (title with status pill, key-facts strip, then tabs and a side column), right-aligned tabular money, soft status pills, the amber session banner in the spirit of its test-mode bar, confirm modals with a grey footer.
- **Vercel:** deploy list (status dot, commit message, mono SHA and branch underneath, build time), environment dot in the top bar, mono for IDs.
- **Attio / Notion:** row actions that appear on hover, inline-editable titles and steps in Module Builder, the tier-access pill that opens a small menu in place, whole-row click.
- **Raycast / Superhuman:** palette layout (icon, label, right-aligned hint, key hints in the footer), the double-ring focus state, quick 100–150ms transitions.

## What changed vs live, per page

**Shell**
- Context line became a two-line cohort switcher; nothing wraps.
- Groups collapse; Health and Build open by default, the active group always open.
- User chip shows name and role on two lines, no truncation. Rail collapse kept.
- Breadcrumb now includes the group. Search with ⌘K and an environment dot replace the demo chip.

**Overview**
- Five KPIs sit on one row (three at 1024, two on phone) instead of four plus an orphan.
- Chart, activity, funnel and attendance keep their data. Before the cohort starts each shows a designed "Not started" state.

**Curriculum**
- Fitted grid, no sideways scroll at 1024 and up.
- Tier access is a pill with a menu. Status is a dot and label.
- Drag handle replaces the chevrons (Alt + arrows from the keyboard; arrows on phone).
- Deployed shows "Not started" or "Not published" as text, and a bar with % once running.
- Preview and Edit appear on hover; Publish stays visible on drafts; the rest is under "…".
- Added a filter row.

**Module Builder**
- Module list, inline-editable name and summary, reorderable steps, files, and a settings panel.

**Resource Vault, Cohorts & Sessions, Announcements, Learners & Teams**
- Same table system. Cohorts gets a key-facts strip. Learners shows builds deployed as a bar.

**Tiers & Upgrades**
- Team Tier is two cards, 16 and 41 seats. Price fields, access matrix and upgrade requests kept.

**Audit Log, Roles & Permissions**
- Same table system; matrix uses checkboxes with a Yes/No label.

**Console pages**
- Same header, table, card and spacing as the admin pages. Health became "System Health" next to Overview.

## Safety rules as mocked
- Roles: Owner, Admin, Support. Support cannot refund or void (Billing shows "Read-only for your role"), cannot masquerade, and does not see Integrations, Deploys, DB Health, Flags or Roles.
- Masquerade: Owner and Admin, required reason, 15 minutes, +15 per extension with a new reason, 60-minute maximum, persistent banner, every write blocked and logged.
- No replace-secret control. Flags are read-only. No delete-workspace. Billing job has no Run now.

## Sample data caveats
- "Today" in the mock is Thu, Dec 10, 2026, so Week 2 has data. The cohort toggle shows the pre-start states.
- Tier prices ($995, $4,995, $9,995), plan prices and MRR are invented and labelled as sample. Accelerator figures ($7,500 or 2 × $3,750, 15 seats) are from the round 1 brief.
- Module names beyond those in the screenshots, people, teams and IDs are fictional.

## Open questions
1. Tier prices are editable on the live Tiers page but round 1 treated prices as product rules. I kept the field, guarded by permission. Which is right?
2. Learners & Teams (cohort progress) and Workspaces/Users (account support) overlap. Keep both, or merge?
3. The live top bar has a "Demo: Admin · Week 2" chip. I moved that to the mockup bar. Does the product need it?

## Self-critique
Checked on screen across this round:
- 1280: Curriculum, Overview, Workspaces, workspace detail, Tiers & Upgrades, Module Builder.
- 1024: Curriculum, System Health, Workspaces, Billing, API & Webhooks, Integrations, Scheduled Jobs, user detail, incident detail, Usage, Deploys & Commits, DB Health, Email Log, Audit Log, Incidents, Users, Roles & Permissions, and loading, empty and error on Audit Log.
- 390: Curriculum, Overview, System Health, workspace detail, Billing, API & Webhooks, Scheduled Jobs, Integrations, Environment Flags, incident detail, Masquerade, Usage (top of page), Deploys & Commits, DB Health, Email Log, Audit Log, Incidents, Users, Roles & Permissions, and loading, empty and error on Email Log.

Fixed from the last pass:
- Email addresses broke mid-word on phone cards. They now break only after the @.
- Avatars are hidden in phone list cards to give names and emails the width.
- Pages with and without a scrollbar had different content widths. The scroll area now reserves the gutter.
- The mono timestamp title on phone Audit Log cards was too heavy.

Curriculum status copy: "Hidden from learners" in full, no wrapping, at 1280 and 1440 (Status track 128px). At 1024 it is a "Hidden" chip with the full phrase in its tooltip and aria-label. Phone cards show the Draft status with the same phrase in the label.

Known and accepted:
- Loading, empty and error were checked on one table page per width, not on every page. All pages use the same three state components.
- The lower half of Usage on phone (chart and By-workspace cards) was not captured on screen.
- Not built on Fable 5.2.

## Final pass
- Roles & Permissions: Support's "Refund or void an invoice" and "Start and extend masquerade" are locked as product rules (disabled box, lock icon, tooltip "Fixed by product rules"). Every other permission change opens a confirm modal before it applies, then is audit-logged.
- Curriculum at 1280: the Live session cell shows the short session name ("Lead-Source ROI", "Morning Brief", "Scorecard") without "Session N ·" or "Live Build", with the date on the meta line and the full title in the tooltip and aria-label. Rows stay at 52px. Tier access is 116px, Live session 132px and Status 120px at this width so the AI Employee column gets the rest. 1440 is unchanged.
- Overview at 1024: KPI tiles sit on a 6-column grid, three spanning 2 and two spanning 3.
- Seat bars: 90% and up is amber (#D99A1C) on plans that can add seats. A fixed-seat plan that is full (AI Accelerator, Insiders: 2 of 2, 1 of 1) shows a neutral full bar (#9AA39E). Red is not used for capacity.
- Phone Overview: the chart shows four date ticks on one line. Funnel rows put the name and numbers on one line with the bar full width below.
- KPI bottom lines shortened to fit one line: "Of builds available", "2 open requests".
- Phone Curriculum: footer reads "Reorder from the … menu". The header is shortened to "15 AI Employees · 3 in Agent Tier · 6 draft" so it fits one line. Draft cards lead the meta line with "Hidden from learners", followed by the session date without the session number.
- Deployed column is 96px.
- Phone workspace detail: the facts strip is an even 2-column grid with values at 15px so "Team Plan · 41 seats" fits on one line. A longer value ends in an ellipsis and does not wrap.
- Sidebar: closed groups show no page count. Operations shows "1 incident" when closed.
- Checked on screen after this pass: Curriculum and Workspaces at 1280, Roles & Permissions and its confirm modal at 1280, Overview at 1024, and at 390 Overview (chart, funnel), Curriculum cards, workspace detail facts strip and the Roles matrix. Not checked on screen: Curriculum at 1440 and 1024, and the tooltips.

## Last pass
- Phone Overview: Live attendance labels size to their content so "Session 2 · Dec 9" shows in full. Funnel names wrap to a second line above the bar when long.
- Time zone: MST is the only label. Cohorts & Sessions no longer shows a Central time.
- Cohorts & Sessions: the When column is a fixed 188px so the date, time and "MST" show in full at 1280 and 1024. Module (68px) and Replay (72px) were narrowed so the Session column keeps room for the full title at 1280. On phone the "Opens" and "Cadence" facts span the full width so the time and zone are not cut off. The Session column declares a 250px minimum, the width its longest title needs, so the Module column drops at 1024 and the title shows in full there too.
- Curriculum descriptions at 1280 still end in an ellipsis in every row; the wider AI Employee column fits names in full, not descriptions.
- The Cohorts & Sessions changes were not checked on screen by the author before hand-off.
