# Learner portal: signed-off drops

Every entry in `learner-parity.json` whose status is `signed-off-drop` needs one approval line here, or `pnpm parity:learner` fails (Connor's parity brief § 3). The line format is Connor's:

```
ID — what is lost — Approved by Connor Leiva on <date>, "<his exact words>"
```

Rules:

- Only Connor writes the approval, in his own words. An agent's or a reviewer's OK is not his sign-off (brief § 4).
- One line per ID, outside the "Pending Connor's sign-off" section. `compliance/parity/check.ts` reads every line in that format and ignores the pending section.
- To approve a pending drop, move its ID into an approval line under "Approved" with his date and exact words, and delete it from the pending list.

## Approved

SH-4 — Time-zone picker (Auto plus zones, "Session Times Show as …") in the profile menu; session times always show Mountain with Central in parentheses — Approved by Connor Leiva on 2026-11-17, "No time-zone picker."

Source: Connor's learner build brief (Nov 17, 2026), PR 6, quoted in DECISIONS.md D-178 ("No time-zone picker."); his parity brief of Nov 18, 2026 confirms it: "SH-4 (time-zone picker) is already approved by Connor. List it as approved."

## Pending Connor's sign-off

Proposed intentional drops from his parity brief § 2 ("Not to build"), plus one best call (A-6). None of these is approved. Each one fails `pnpm parity:learner` until he signs it off above.

- E-14: the "Your Deployment" card. Learners lose the runtime status token, platform, Open link, issue line, last run, and the Mark as Deployed, Pause, Resume and Reconnect buttons (`markDeployed`, `setRuntime`).
- E-15: the Run drawer. Learners lose the input box, Run, Copy all and the recorded last run (`recordRun`). It was simulated in the prototype.
- A-6: the `POST /api/mutate/markDeployed`, `setRuntime` and `recordRun` calls. Nothing a learner can see beyond E-14 and E-15; listed because it is their API (best call, not named in § 2 by ID).
- SH-8: the Locked AI Employee preview modal. Agent-tier learners lose the preview of a Team-only AI Employee and its link to the Team tier page. None is published in production that the inventory could find (unverified).
- P-1: the `/team-tier` sales page and its "Request a consultation" button.
- R-6: the `/team-tier` address itself, which now lands on Home.
- A-7: `POST /api/mutate/requestUpgrade` from the Team tier page. The Vault's own two requests stay.
- C-13: the Console's Tiers request status for Team tier upgrades, which only Vault requests now reach.
- SH-5: the Light/Dark theme switch. Everyone sees the light theme.
- SH-6: the Collapse/Expand Sidebar toggle. The rail now appears on its own between 768 and 1199px.
- MO-3: the user-chosen full sidebar or rail at 768px and up (the same toggle, seen on tablets).
- D-10: the "Cohort Community" quick link. Its figures were the prototype's.
- E-22: AI Employee pages for any module that is not a course week (`/employees/:id` goes to Home). The brief asks to confirm first that no published non-course module exists in production; that needs a read-only look at the production database.
