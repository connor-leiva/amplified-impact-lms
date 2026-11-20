# Step page: instructions for Claude Code

Read `HANDOFF.md` before changing anything. Looks come from `reference/interaction-demo.mp4` (frames in
`reference/frames/`); motion comes from the brand files in `brand/` (Amplified Impact Motion v1). `mockup/step-2.html`
is both together, and `src/` renders the mockup exactly.

1. Port `src/` into `apps/web` as it is. Convert to TSX and nothing else: same class names, ids, DOM order and CSS
   values. Use `src/step-page.css` and `src/step-page.tokens.css` verbatim as global stylesheets, loaded after
   `ai-motion.css`.
2. `src/motion/ai-motion.css` and `src/motion/ai-motion.tsx` are the brand's files. Never edit them. If the LMS
   already has them, they must match the sha256 in HANDOFF.md §3.
3. Never style or time anything from a description, from memory, or from a screenshot you made. If something must
   change, change `mockup/step-2.html`, run `npm run css` and `npm run review`, and re-run both tests.
4. You are done only when both commands exit 0 against the deployed preview, with the test learner's saved session:
   `node diff/pixel-diff.mjs --target <url> --storage-state <auth.json>` and
   `node diff/video-parity.mjs --target <url> --storage-state <auth.json>`.
   When a state fails, open its image in `results/` or `results/video/` (frame | page | heat) and fix the code,
   not the test. Paste both summaries in the PR.
5. Use the seeded test learner only (#190), reset to: step 1 done, step 5 waiting, nothing checked on step 2,
   no video progress. The tests tick real boxes and mark the step done. Never point them at a real buyer.
6. Ship nothing mockup-only: the MOCKUP bar, the "Text styles (review)" link and section, `ReviewSection.jsx`.
7. Don't edit `reference/`, `brand/`, the limits in `diff/compare.mjs`, or the states and masks in `reference/states.json`.
