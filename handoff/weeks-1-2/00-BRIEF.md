# Claude Code Brief: Seed Weeks 1 and 2, and Keep Every Word Editable in the Week Builder

For Claude Code, working in `connor-leiva/amplified-impact-lms` with push access. Written by Claude. Rewritten Sat, Nov 21, 2026 and checked against `main` at `e57c34d` (PR #231), after LMS v3 landed (D-225 to D-234).

Connor has read and approved the content ("This is perfect," Nov 21). The readable version of everything in `data/` is his doc, "Weeks 1 and 2: What Learners Will See."

## The Goal

Weeks 1 and 2 of the Amplified AI Accelerator fully built in the portal (learn.amplifiedimpact.io): every step's body on both paths (Claude and ChatGPT), with its buttons working. Today each week holds six bare steps. The words are written and structured. Your job is the code that puts them in, once, and then gets out of the way.

**When.** Under the release plan (D-175), Week 1 opens at the start of its live build, Wed, Dec 2, 2026 at 12:00 PM MT, and Week 2 on Wed, Dec 9. Both are Scheduled, so they open by themselves with whatever is in them. Connor may move Week 1's opening to Wed, Nov 25 (see Timing), so treat Nov 25 as the date to beat.

## Connor's Rule: Seed It, but the Builder Owns It

Connor, Nov 21: "I'm okay having it seed stuff into the portal, but I still want it ALL configurable in the admin portal in the curriculum builder."

What that means for this work:

1. **The seed writes the same records the Week Builder edits.** No learner copy for these weeks lives in runtime code (`copy-guard.test.ts` already holds that line; keep it green).
2. **It runs once.** After it runs, the Week Builder is the only place this content changes. No later deploy, rerun or new data step puts seed text back over something a person edited.
3. **Every field the seed fills has a control in the Week Builder.** Checked on `e57c34d`: the builder edits each step's title, who, time, minutes, done when and goal; checklist items with their detail, role, optional flag, click path, sub-checks, depends-on and button; callouts; accordions with their paragraphs, table and link; the seat card rows; the card's operator line and outputs; the Kit; and the sessions. If you find a field in `data/` that the builder can't edit, stop and tell Connor. Add the control or leave the field out; don't seed something he can't change.
4. **Anything new built for these weeks takes its words from builder fields.** That is the seat card form (2, below).
5. **Prove it after deploy,** on the test account: change one of each kind of thing in the Week Builder (an item's detail, a Copy button's prompt, a callout, an accordion table cell, a seat card row, a step's title), save, see it on the learner page, deploy again, and see the edit still there.

**Not builder fields today, by Connor's own earlier approvals. Leave them unless he says otherwise:** the Turn in button's words ("Turn in", then "View"), the drawer's wording and its file limits (D-230: "its words are fixed").

## What's Already in the Repo (Don't Rebuild It)

| Piece | Where It Stands on `e57c34d` |
|---|---|
| Turn in (the upload) | Built: D-230. `{ type: 'upload', kind: 'live_read' \| 'checkpoint' }`, the Week Builder's "Turn in" button, the drawer, the staff Submissions card, migration `0034_submissions`. The team's owner and operator turn in; every turn-in item in `data/` is tagged Owner |
| The cohort Community | Built: D-231 |
| The form drawer | Built for the intake and the stack card: D-229. `{ type: 'form', formId: 'intake' \| 'stack-card', label }` |
| Live weeks on the v3 week page | Built: D-234. The week's seat card shows as a Reference accordion |
| The v3 flag | `VITE_LMS_V3`, off unless the build sets it; the seeded test learner always sees v3. **With the flag off, an Upload action draws nothing.** Weeks 1 and 2 use Turn in on steps 4 and 6, so the flag has to be on for learners before Week 1 opens. Tell Connor where that stands |

An earlier copy of this folder had an upload patch and a community patch. Both are retired: the repo built its own.

## What's in This Folder

| Path | What It Is |
|---|---|
| `00-BRIEF.md` | This brief |
| `data/week-1-steps.json`, `data/week-2-steps.json` | **The source of truth** for the step bodies: 6 steps a week, both paths, every block, id, dependency and button |
| `data/week-1-card-changes.json`, `data/week-2-card-changes.json` | The week-level fields that change: each row has the field, the seeded value and the new value |
| `reference/WEEK-1-BUILDER-LOAD-SHEET.md`, `reference/WEEK-2-BUILDER-LOAD-SHEET.md` | The same content as the JSON, written for a person clicking through the builder. Read these for intent; seed from the JSON |
| `reference/seat-card-fields.md` | What the seat card form collects (for 2) |

The JSON and the load sheets come from one script, so they agree. Every string passed the builder's own copy rules (`copyIssues` in `course-rules.ts`) when it was written; your tests run them again. If you find a mistake in the words, tell Connor rather than rewriting.

**Why Week 1's step 5 changed.** The sales page (`apps/web/src/team-build/content.ts`) and Week 0's live copy say Week 1's hire is the Finance Analyst, running monthly and putting last month's numbers on the Owner Desk, and they give Week 3 to the Meeting Manager. The Nov 17 spec and the Week 1 seed kept that schedule for Week 3. So step 5 is now "Schedule the Finance Analyst," and Week 2's Lead Desk Monitor also puts each agent's follow-up list on the Team Board.

## The Work, in Order

### 1. Seed the Step Bodies With a One-Time Data Step

Use the D-175 data-step mechanism (`apps/api/src/db/data-migrations.ts`, the `packages/core/seed/*` steps; `five-words-v1.ts` and `required-v1.ts` are the closest patterns). Add one step, for example `packages/core/seed/weeks-1-2-steps-v1.ts`, and register it last in `DATA_MIGRATIONS`. It runs once on deploy, in one transaction, under the advisory lock, with an audit row per change.

**What it changes.** For modules `accelerator-week-1` and `accelerator-week-2`, each of the 6 steps (matched by position and by its seeded title) gets: `who`, `timeLabel`, `doneWhen`, `goal`, and `paths.claude.blocks` / `paths.chatgpt.blocks`.

**Two steps also change their row**, to match the sales page:

| Step | Seeded | Becomes |
|---|---|---|
| Week 1, step 5 | Title `Save the Team File`, 5 minutes, goal `Save the team file to AI Office / Map Your Spend` | Title `Schedule the Finance Analyst`, 15 minutes, the goal in the JSON |
| Week 2, step 6 | 5 minutes | 10 minutes (title and goal stay) |

For those, the JSON's `title` and `mins` are the new values. Match these steps by position and the seeded title in the table.

**And the week-level fields in `data/week-N-card-changes.json`:** the seat card rows, one output line, the operator line (Week 1) and the live build's Required line. Each row gives the field in the builder's words, the seeded value and the new one. Find the stored field by meaning (`course.seatCard.*`, the card's outputs and operator line, the live build's required line), change it only when it still holds the seeded value, and name any you skip. Seat card rows are hire copy: `course-rules.ts` must pass on every new value.

**Only over the seed (this is rule 2 above, in code).** A step changes only when it's still as the last seed left it: no blocks on either path. A step that has blocks (someone edited it in the builder) is left exactly as it is and named in the step's summary. A week-level field changes only while it still holds its seeded value. Apart from the two rows above, never change `text` (the title) or `mins`. Never change a step's id, the week's status, opens, due date, sessions, Kit, media or anything not listed here. Nothing gets published or scheduled.

**Mapping the JSON** (verify each against `course-types.ts` and the builder's own save path):

| JSON | Repo |
|---|---|
| step `who` | `Step.who` |
| step `time` | `Step.timeLabel` |
| step `done` | `Step.doneWhen` |
| step `goal` | `Step.goal` |
| step `title`, `mins` | already seeded; leave them, except the two rows above |
| `claude`, `chatgpt` | `Step.paths.claude.blocks`, `Step.paths.chatgpt.blocks` |
| block `video` | **skip it**: no recording exists yet. Also skip the checklist item right after it whose id ends `-watch` ("Watch the video"), and drop any dependency on it. Videos go in through the builder as they're recorded |
| block `check` | `CheckBlock`: `id`, `title`, `detail`, `role`, `optional`, `click` → `clickPath`, `tasks` → `subchecks` (each string is an id and a label, split at its vertical bar), `deps` → `dependsOn` (same step). `other` and `play_at` are empty in both weeks |
| check `role` | `Owner` → `owner`, `Operator` → `operator`, `Each of you` → `each`, `No role tag` → `''` |
| block `callout` | `CalloutBlock`: `Tip` → `tip`, `Heads up` → `heads_up`, `Doing it yourself?` → `diy`; `text` |
| block `accordion` | `AccordionBlock`: `title`, `paras` → `body`, `head` + `rows` → `table`, `link` + `link_label` → `link` |

**Buttons** (`button` on a check):

| JSON `kind` | Action |
|---|---|
| `No button` | none |
| `Copy` | `{ type: 'copy', label, text }`. The text exactly as given, line breaks kept. These are long prompts; any change breaks them |
| `Download` (`kit`: titles) | `{ type: 'download', kitItemIds }`. Look each title up among the week's Kit items at run time, by exact title. A title that isn't in the Kit yet: leave the action off that item and name it in the summary. The two skill zips are in the Vault already; the eight PDFs are being made in Claude Design |
| `Add to calendar` (`session`: title) | `{ type: 'calendar', sessionId }`, the session with that title in the week |
| `Upload` (`collects`) | `{ type: 'upload', kind }` (D-230): `Report for a live read` → `live_read`, `Checkpoint` → `checkpoint`. The JSON's `label` has no home, because the button's words are fixed; drop it |
| `Form` (`form`: `Seat card`) | the seat card form's action (2). Until that form exists, leave the action off the item and name it in the summary |

**Checks the step must pass**, as tests in core:

- The plan over the seed snapshot changes all 12 steps and every row in the two card-changes files; a second run changes nothing.
- A step with blocks is skipped and named; the other steps still change. A week-level field that no longer holds its seeded value is skipped and named.
- Ids are unique on each path; every `dependsOn` resolves to an earlier item on the same path.
- The course rules report nothing for either week after the plan (`copyIssues` over `moduleCopyFields`): no em dashes, the banned line, hire copy, and every time of day in MT.
- Missing Kit titles and sessions are named, not guessed.

**Its decision entry:** the next free D-number (D-235 on `e57c34d`; D-232 and D-233 are reserved). "Asked for by: Connor, Nov 20 and 21, 2026: load Weeks 1 and 2 by code, and keep all of it configurable in the Week Builder."

### 2. The Seat Card Form

Connor, Nov 20: the team fills in and signs its seat card **in the portal**, instead of on a blank PDF. Step 6 of each week has an item for it (id ending `-fill`, JSON button `{"kind": "Form", "form": "Seat card", "label": "Open the seat card"}`), then the owner's "Sign the seat card."

Today the `form` action knows two forms (`'intake' | 'stack-card'`). The seat card is a third, on the same drawer (D-229's `FormDrawer`). D-225 holds: the mockup is the design, so build it from the drawer's own pieces and bring Connor anything it can't draw.

What it needs (details in `reference/seat-card-fields.md`):

- **Its questions come from the builder (rule 4).** The week already stores its seat card (`course.seatCard`: seat, reportsTo, runs, pulls, applies, produces, tookOver, cantDo, firstRun), edited on the Week Builder's Seat Card card. The form shows those rows as the standard and takes the team's own answer to each. Change a row in the builder and the form changes. No seat card wording in code.
- **The builder can pick it.** The Button menu's Form option lets staff choose the seat card for that week, with a label, the way an Upload picks what it collects.
- **Per week:** Week 1 is the Finance Analyst's card, Week 2 the Lead Desk Monitor's. One card per team per week.
- **What the team fills:** Reports To, Runs, Pulls, Applies, Produces, Took Over (the task, and minutes per occurrence from the team's Week 0 time baseline, or "not done today"), Can't Do, First Run (the date).
- **Saving and signing:** saving the filled-in card checks the step's `-fill` item for the team. The Team Owner signs; the Operations Lead can fill it in but not sign. Signing checks the `-sign` item for the whole team, as a submitted intake checks its item (D-229).
- **Who:** Team Owner and Operations Lead edit; agents read; staff previewing see it read-only. Staff can read every team's signed card.
- Nothing is emailed, and nothing goes to GHL.

### 3. Turn In Has to Tick the Item on Both Paths

A turn-in checks one checklist item for the team: the first item on the step whose button collects that kind (`asksOf` in `core/submissions.ts`, Claude path first). Each of our turn-in steps has that item twice, once per path, with different ids, because the builder refuses a repeated id on a step (`w1s4c-submit` and `w1s4g-submit`). So today a team on the ChatGPT path turns in its file and its own item stays unticked. No test covers that case.

Make a turn-in check every item on the step whose Upload action collects that kind, on both paths, and add the test. Do the same in the seat card form (2): saving ticks `-fill` on both paths, signing ticks `-sign` on both.

### 4. Deleting Turned-In Files When the Cohort Ends

The Subscription Agreement, Section 7 (`apps/web/src/legal/agreement.ts`; never edit it): "If you share files with us for a live build, we use them only to help your team during that build and delete them when the cohort ends." On `e57c34d`, Turn in keeps every version and has no delete. Ask Connor how he wants this met before building it. The simplest shape: a staff action, audited, that removes a cohort's turned-in files from the bucket and marks their rows.

### 5. Deploy Order

1. The turn-in fix (3) with or before the data step (1).
2. The seat card form (2) with the data step, or first, so the Form action exists when the seed runs. If the form isn't ready, ship the seed without those two buttons; they can be set in the builder the day the form lands.
3. If the PDFs are in the Kits before that deploy, the Download buttons wire themselves. If not, they get wired in the builder after.

### 6. After Deploy: In the Builder

Connor, or Claude in Chrome with his OK:

- Run the proof in Connor's rule, point 5.
- Upload the 8 PDFs to the Vault and attach each to its week's Kit under its exact title, "Hidden until the week opens." Then wire any Download button the data step's summary named.
- Check the four sessions (each week's live build and office hours) have their Zoom links.
- Preview every step on both paths, on the test account.
- As each of the 12 videos is recorded: add its video block and its "Watch the video" item on the step (the load sheets say how). D-234 keeps a week with a real video in its week-level Media on the older week page, so leave those placeholders alone until Connor says where week videos go.
- Connor publishes or moves opening dates. Nobody else does.

## Where the Site and the Course Still Disagree (for Connor, Not You)

Found in the Nov 20 audit. None of these are yours to change without Connor's say; the sales page is Spring-reviewed copy and `/agreement` is never edited.

| Item | Sales Page or Agreement | Course |
|---|---|---|
| Week 3 | Run the Week, Meeting Manager | The portal's Week 3 is still the spec's "Numbers on the 5th" |
| Week 0 due | "Due December 2" | Mon, Nov 30 at 12:00 PM MT |
| Export teams | An export "takes a few minutes a month" | Week 2's Lead Desk Monitor needs teams without Sisu to export every Monday |
| Office hours | Thursdays | Week 2's is Fri, Dec 11 |
| AI tool | Hires run in Claude; the skill library also works in ChatGPT | Every hire has a ChatGPT path |
| Second person | ops lead | Steps and PDFs say Operator; the account role is Operations Lead |
| First day | Page: Wed, Dec 2. Agreement: Tue, Dec 1, 2026 | Wed, Dec 2 |
| Insiders starts | Page: Tue, May 4, 2027. Agreement: Mon, May 3, 2027 | |

## Rules That Still Hold

- Never publish or schedule a week, or change its opening, unless Connor says so.
- No emails and no texts. GoHighLevel only as D-229 already allows for the intake; never write to Spring's GHL location.
- Never touch billing, Stripe, users, roles, tiers or GHL in the admin console.
- Never read, copy or paste API keys, Railway variables or passwords.
- Test only with the test account, never a real customer's (the brief names one; the name is left out of this public copy).
- Utah Life agents' view doesn't change: their locked items say "Not included with Utah Life access," with no upsell.
- The repo's own rules (CLAUDE.md and `handoff/lms-v3/CLAUDE.md`): logic in core, tokens only, `fmt.*` for times, and no UI the mockup lacks without Connor's approval.

## Timing (for Connor, Not You)

Each week's step 1 asks teams to run the skill by Tuesday night so they can turn in a report for a live read at that Wednesday's build. Under the release plan, though, Week 1 opens at that same build. If Connor keeps the plan, the first live reads slip a week. The fix is his alone: moving Week 1's opening to Wed, Nov 25 and Week 2's to Wed, Dec 2 (a builder change).
