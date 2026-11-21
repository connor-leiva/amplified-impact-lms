# LMS shell, week overview, locked weeks, Schedule, form drawer, Community and Turn in: instructions for Claude Code

**The mockup is approved in full (Connor, Nov 20, 2026). Reproduce it pixel by pixel. Not a single thing varies. If
something can't be reproduced exactly, stop and ask. Never ship an approximation.**

Read `IMPLEMENTATION-SPEC.md` first: it is the plan and the contract. Then `HANDOFF.md` and `UX-AUDIT.md`. The truth: `mockup/index.html` for looks and behaviour (`#week-0`,
`#schedule`, `#week-1` … `#week-8` locked, `#community`, `#thread-N`, the drawers), `brand/` for motion, `src/` renders the mockup exactly.

1. Port `src/` into `apps/web` as it is (TSX conversion only). Same class names, ids, DOM order, CSS values.
2. Never edit the brand motion files. Never ship `MockBar.jsx`, `mock.generated.js`, `mock-bar.css`.
3. Never style or time anything from a description, memory or your own screenshot. Change the mockup, `npm run build`, re-test.
4. Done = `node diff/pixel-diff.mjs --target <week url> --target-schedule <schedule url> --storage-state <auth.json>`
   exits 0 on the flagged preview: **no different pixel in any check**. On a failure, open the three images in `results/` and fix the code, not the test,
   its clock or its threshold.
5. Seeded test learner only (#190), in the state HANDOFF.md §6 names. Never a real buyer. Don't click Mark as
   deployed, a calendar link or Join in a script, and don't type into or submit a form on a deployed page in a script.
6. Forms: the profile is the source of truth; GHL is written server side from a queue. Never write to the live GHL
   location from a development or preview build: dry-run until Connor has approved one real payload (HANDOFF.md §9).
   The intake's questions are the LMS's own; the six required and the GHL fields are settled (IMPLEMENTATION-SPEC.md §5.1, Appendix A).
   You never create, rename or delete anything in GHL's settings.
7. The shell wraps every route. Don't restyle the pages that aren't in the mockup (Home, Skill library, Team Hub,
   Resource vault, the step page); open each inside the new shell and report what you see.
8. Content differences (words, dates, sessions, kit items, form questions) are not code bugs. List them and ask.
