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

None. Connor's call of Nov 18, 2026 restored every drop his parity brief had proposed (E-14, E-15, A-6, SH-8, P-1, R-6, A-7, C-13, SH-5, SH-6, MO-3, D-10, E-22): "With all 13 restored, nothing goes into signed-off-drops.md." They are `restored` in `learner-parity.json` (DECISIONS.md D-185, D-186, D-187).
