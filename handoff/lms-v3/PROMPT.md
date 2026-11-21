# Prompt for Claude Code (paste as is; fill in the three placeholders)

> **Read `IMPLEMENTATION-SPEC.md` first: it is the plan, and it outranks this prompt wherever the two differ.** This
> file is the older, shorter brief for the shell, the week overview and the Schedule. Connor approved the mockup in
> full on Nov 20, 2026: it is reproduced pixel by pixel and nothing varies. The gate is zero different pixels.

> **Read `IMPLEMENTATION-SPEC.md` first. It governs.** It was written after auditing the repo and holds the
> contract, the gap register, the decisions Connor must make, and the phases with their gates. This prompt is the
> short version plus the piece-by-piece and motion review scripts (Phase 3 B and C below), which the spec's Phase 9
> calls for. Where this prompt and the spec differ, the spec wins.

You're replacing three things in the live LMS, learn.amplifiedimpact.io, with a finished, verified redesign: the app
shell (side nav and top bar), the week overview (/learn/week/N) and the Schedule (/learn/schedule). You're also
adding one: a form drawer that replaces "download a PDF and fill it in", with autosave, a branded PDF, and answers
synced to the learner's profile and to GHL. The package is in handoff/lms-v3/. The live pages must match the mockup pixel for pixel, at rest and in motion. You port the existing
code and prove every piece with pixel diffs. You don't rebuild from descriptions.

## Truth, in order
1. mockup/index.html (#week-0, #schedule; the form drawer opens from the kit): looks and behaviour. 2. brand/: motion.
3. src/: React that already renders the mockup at 0 %. 4. src/pdf/form-pdf.js and pdf/week-0-intake.sample.pdf: the PDF. HANDOFF.md, UX-AUDIT.md and this prompt only describe.

## Rules
- Port src/ as it is: JSX to TSX and nothing else. Global stylesheets in this order: ai-motion.css, lms.tokens.css,
  lms.css.
- Never edit the brand files, the mockup's values, the test's threshold, clock or states to get a pass. Fix the code.
- Don't ship MockBar.jsx, mock.generated.js or mock-bar.css.
- The shell wraps every route. Don't restyle Home, Skill library, Team Hub, Resource vault or the step page; open
  each inside the new shell, screenshot it, and report anything that moved.
- New branch, behind a feature flag. Don't merge, don't deploy to production, don't enable the flag for learners.
- Seeded test learner only (#190): step 1 done, step 3 in progress, step 5 waiting on step 6 (status waiting), not deployed, only Week 0 open.
  Never a real buyer. Never click Mark as deployed, a calendar link or Join from a script, and never type into or
  submit a form on a deployed page from a script.
- GHL: never write to the live location from a development or preview build. Build the sync behind a dry-run switch
  that logs the payload; show me one payload and wait for my yes. Use the repo's existing GHL client; if there is
  none, read GHL's current API docs and ask before adding an integration.
- The intake's questions come from the LMS (`course.intake`); the package carries a copy with six marked required.
  Ask me which are required and which GHL fields receive them before wiring either.

## Phase 0: baseline
In handoff/lms-v3/: `npm i && npm run build && npm run diff`. All 264 checks must show no different pixel. `npm run pdf` must
reproduce pdf/week-0-intake.sample.pdf. If not, fix your
environment (Chrome version, fonts, scale factor), not the code.

## Phase 1: recon and plan
Find the layout that renders the sidebar and top bar, the components and view-models behind /learn/week/:n and
/learn/schedule, the deployment mutation, the calendar endpoints and the Zoom join link, the feature-flag mechanism, and
whether ai-motion.css/.tsx already exist (compare sha256 with HANDOFF.md §3). Write PLAN.md: files you'll change, the
mapping from each view-model to HANDOFF.md §2 (use UX-AUDIT.md's two "where each piece went" tables), where a week's
status, done and total come from (one source for the nav, the Schedule row and the week overview), and where each
step's doneWhen and status come from. A step whose box waits on another step has status waiting ("Waiting on step N"). Each role's
time is the sum of its steps' minutes.

## Phase 2: build
Brand files → tokens and CSS → Icons → CalMenu → AppShell in the layout → SchedulePage in its route → Hero →
StepList → Kit → Reference → WeekPage in its route → FormDrawer with a fake API → the form API and storage
(HANDOFF.md §9) → the PDF route → the admin Forms block → the GHL sync in dry-run. Commit per piece.

## Phase 3: pixel review
A. `node diff/pixel-diff.mjs --target <WEEK_PREVIEW_URL> --target-schedule <SCHEDULE_PREVIEW_URL> --storage-state
   <AUTH_JSON>`: no different pixel in any check, same size. The test pins the browser clock; the countdown and the Join
   state must follow the client's clock.
B. Write diff/piece-review.mjs: for each piece (shell: brand block, every nav link, the group header, every week
   row, the marker, the foot, the collapsed rail, the top-bar strip, each calendar menu open; Schedule: header,
   toggle, hero in wait/join/live, countdown, every week row, every session line, the break row; week overview:
   header, hero, role filter, every step row, the deployment row, every kit row and button, each rail card, each
   accordion closed/open/hovered, the Next week card; form drawer: head, meter and save status, every question kind
   empty/filled/focused/error, every chip, the banner, the foot in idle/busy/done/error), in every state
   (rest, hover, focus-visible, pressed, and each status), at 1440, 1280, 1100, 900, 820, 640 and 390 wide, take element
   screenshots on the mockup and the target and diff them. Pass = 0 differing pixels. Use real input to reach states;
   use the mockup's Preview buttons only on the mockup.
C. Write diff/motion-review.mjs: compare computed transition-*, animation-*, transform and opacity for every element
   under [data-ai] at rest, hovered, pressed and after each state change; then freeze each motion with
   document.getAnimations() at 0, 60, 120, 240, 400, 560 and 900 ms and diff the frames (page arrival, label rolls,
   presses, the nav marker's move, the drawer in and out, field focus, the async buttons, calendar menu open and close, filter thumb and row rise, progress
   fill, accordion open and close, Copy). Read the steps-done figure
   every frame during a count-up; it must step through the same values on both pages.
D. Reduced motion (OS setting, and .aim-reduced on <html>): everything on its final frame at once.
E. Only step 5 left, all 8 done, and Deployed: use a seeded learner in each state with `--assume s7`, `--assume s8`
   and `--assume deployed`.
   Check the Mark as deployed click and Undo by hand on a test learner and record what you saw.
F. Forms, by hand on the test learner with GHL in dry-run: type, wait for Saved, reload (the answers are back),
   submit with an answer missing, submit complete, edit after submitting, download the PDF as a draft and as
   submitted. Diff your PDF against pdf/week-0-intake.sample.pdf (same answers, both rendered to PNG). Paste the
   logged GHL payload into the PR.
Before trusting B and C: run them harness vs mockup (all 0), then change one padding by 1 px and one duration by
10 ms in a scratch copy and confirm both scripts flag it.
For any difference: look at the images, fix the code, re-run everything. If it comes from content, list it and ask.

## Phase 4: report
Open a PR (don't merge): summaries of A to F, results/piece-review.md, results/motion-review.md, your Chrome version,
and HANDOFF.md §7's decisions for me to confirm (keep the mockup's behaviour until I decide).

Stop and ask if: there's no preview URL or test session; a brand file in the repo doesn't match its checksum; the
data lacks something the pages need (doneWhen per step, minutes per step, role membership, a session's start time
in UTC, steps per week); the host can't run headless Chrome for the PDF; there is no GHL client or no agreed custom
fields; or a pass would need a change to a page that isn't in the mockup.
