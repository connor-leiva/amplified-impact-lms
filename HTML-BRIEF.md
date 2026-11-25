# Claude Code Brief: Convert The Library Skills To Hand Back A Page

Draft v1, Nov 23, 2026, for Connor to run himself in Claude Code (Grok Bot cannot operate Claude Code).
Self-contained: everything Claude Code needs is in this file. Paste it as the first message in a Claude Code
session opened in a fresh clone of `connor-leiva/amplified-impact-lms`, or save it as `HTML-BRIEF.md` at the repo
root and say "Follow HTML-BRIEF.md".

## Ground Rules (Read First)

- Work on a new branch `skills-html-pages`. Commit in small steps. **Open a pull request. Do not merge. Do not
  deploy.** Nothing in `apps/` changes except what a failing test proves must change.
- Read `CLAUDE.md`, `skills/README.md` and `scripts/skills.mjs` before touching anything. Their rules win over
  this brief on repo mechanics; this brief wins on what the page looks like and what the build checks.
- `skills/README.md` rules that bite here: no em or en dashes in ANY file under `skills/`; never edit
  `apps/web/public/downloads/` by hand (rebuild with `node scripts/skills.mjs build`); `node scripts/skills.mjs
  check` must pass; a ChatGPT Project version holds at most 4 files (instructions.md, paste.txt, up to 3 more .md).
- Do not change any skill's analysis, standards, guardrails or Run / Draft / Own lines. This is a wrapper change:
  same content, delivered as a page.
- Only made-up practice data. Never a real client file.
- Stop and write a note in the PR description instead of guessing when something here conflicts with the repo.

## Part 1: Add The Shared Page Kit

Create `skills/_page-kit/` with these files, exactly as given in the appendices:

```
skills/_page-kit/
  scripts/build_page.py           (Appendix B)
  scripts/make_chatgpt_kit.py     (Appendix C)
  assets/base-template.html       (Appendix D)
  assets/fonts.css                (build it, see below)
  assets/FONT-LICENSE.txt         (the SIL Open Font License 1.1 text for Geist)
  references/page-format.md       (Appendix E)
  sample/facts.json, page.json, words.json   (Appendix F)
  tests/run_tests.py              (Appendix G)
```

`fonts.css`: four `@font-face` rules (Geist 400 and 500, Geist Mono 400 and 500), each `src:url(data:font/woff2;base64,...)
format("woff2")`, `font-display:swap`. Get the woff2 files from Vercel's Geist release
(https://github.com/vercel/geist-font, OFL 1.1, Copyright (c) 2023 Vercel, in collaboration with basement.studio)
and base64 them with a short script. Put the OFL text in `FONT-LICENSE.txt`. If Connor has the Map Your Spend
zip, its `assets/report-template.html` first `<style>` block is the same CSS and can be copied instead.

Then extend `scripts/skills.mjs`: a skill whose `skill.json` has `"pageKit": true` gets, in its Claude zip,
`scripts/build_page.py`, `assets/base-template.html`, `assets/fonts.css`, `assets/FONT-LICENSE.txt` and
`references/page-format.md`; and in its ChatGPT zip, `page-kit.md` (from `make_chatgpt_kit.py`) counted as one of
the 3 extra files. Add a drift test like the existing one so a skill's shipped copy can never differ from
`_page-kit/`. `_page-kit` is not a skill: make sure the catalog, `check` and the library skip it, the way `_shared` is skipped.

Acceptance for Part 1: `python3 skills/_page-kit/tests/run_tests.py` prints 14 of 14 passed;
`node scripts/skills.mjs check` passes; the repo's own test suite passes.

## Part 2: Convert Each Skill

For every skill in the wave you are on:

1. Set `"pageKit": true` in its `skill.json` and bump `version` (minor).
2. SKILL.md: add Block 1 (Before You Start: Code) after the purpose, and replace the chat-only output with Block 2
   (Hand It Back As A Page), both from Appendix H. "Output, In This Order" stays: it now says the page holds these
   sections in this order and the chat gets four lines. Keep SKILL.md under about 150 lines.
3. Map each "Output, In This Order" item to a section kind using the per-skill notes below. Bottom line becomes
   `headline` plus `findings`; the "one thing to do first" becomes `moves[0]`. All drafts go in ONE `drafts`
   section. Check Before Sending is always the last section, a `checklist`.
4. Numbers: where the skill's inline analysis code already writes a JSON file, that file is `facts.json`. Where it
   does not, end the analysis code by writing `facts.json` with every number the output uses. Pass the user's
   files with `--inputs` too.
5. Make a sample page from the skill's own practice files: `sample-page.json`, `sample-words.json`, and the built
   `<Skill-Name>-Sample.html` under `evals/page/` (not shipped). Screenshot it with Playwright at 1280 px and
   390 px wide and print it to PDF; commit the PNGs and PDF under `evals/page/`.
6. ChatGPT: `chatgpt/instructions.md` gets the same Hand It Back step, written for ChatGPT ("the files in this
   project", "save the two blocks in page-kit.md to files in your code tool", "give the download link and say:
   download it now, the link expires; if it fails, run the build again for a fresh link"). If that pushes the
   project past 4 files, merge two reference files.
7. `page-notes.md`: "What comes back" now says a page you can sort, search and print, plus four lines in the chat.
   `sample.md`: keep the text sample, add a line pointing to the page sample.
8. Re-run the skill's `evals/` cases as before and add these checks to its objective checks: the page builds; the
   build printed no CHECK or STOPPED lines; the page has the sections in the SKILL.md order; no phone number,
   email address or account number appears in the page unless the skill's output already shows it to the user.

### Wave 1: Skills Whose Analysis Code Already Writes JSON (Do These First)

| Skill | Facts file | Section mapping |
|---|---|---|
| team-pnl-review | `pnl_report.json` | What I Used → list; How Revenue Is Recorded → table (month, basis); Company Dollar and Margin → tiles + math; Expense Mix → table (filters: bucket); What Changed → table; Cost per Closing → table or list with the skip reason; Anomalies → list; Questions for Bookkeeper, CPA, Broker → list (one section each); Owner Brief + Email to Bookkeeper → drafts; Check Before Sending → checklist |
| fub-pipeline-review | `pipeline_review.json` | Stage aging → table (filters: stage, agent; sort by days); What moved → table; questions → list; drafts → drafts. Never a contact email or phone on the page |
| database-health-check | `health_report.json` | Health Report → tiles (size, stale, never contacted) + tables by stage, source (top 10), agent; Cleanup Worklist → list with counts and the CSV file name only; Re-Engagement Segments → list (each with its Smart List filter); Questions → list; Nurture Drafts → drafts. Names and phones stay in `cleanup_worklist.csv` |
| l10-meeting-prep | `l10_prep_data.json` | Scorecard → table (row, goal, actual, owner, `_status` off when off goal); Rocks → list; To-Dos → table; Issues → list; Headlines → list; agenda → timeline (times end in MT) |
| agent-1on1-prep | `one_on_one_data.md` + the JSON it writes | Numbers Against Goal → tiles + math; What Changed → table; Last Time's Commitments → list; Open Coaching Questions → list; Possible Focus Areas (Your Call) → list; Agenda → timeline; Recap Template → drafts; Check Before Sending → checklist. The shared sample in Appendix F is this skill |
| tc-file-audit | `tc_dates.md` + its JSON | Missing Items → list (off); Incomplete Items → list (hold); Due This Week → timeline (past due first); Message to the Agent + Note to the Broker → drafts |
| recruiting-prep | its JSON | List mode: tiered list → table (filters: tier, source); one-recruit mode: tiles + list; outreach → drafts with the consent and opt-out lines kept |
| new-agent-onboarding-plan | `plan_dates.py` output | 30-day plan → timeline (dates from the script only); checkpoints → list; welcome note → drafts |

### Wave 2: Strong Fits Without A JSON File Yet

morning-brief, due-diligence-review, low-appraisal-response, new-construction-review, counter-explainer,
offer-comparison, pricing-conversation-prep, listing-appointment-prep, showing-tour-prep, fub-automation-audit,
ai-brain-tuneup, sphere-touch-plan, content-opportunity-research. For each: add `facts.json` writing to the end of
the existing inline code (or, for skills with no math such as counter-explainer, showing-tour-prep,
fub-automation-audit and ai-brain-tuneup, build with `--inputs` only so every number traces to the uploaded
files). Tables: before and after terms (counter-explainer), side-by-side offers (offer-comparison), comps
(pricing-conversation-prep), issue tiers with page references (due-diligence-review, low-appraisal-response),
findings (fub-automation-audit, ai-brain-tuneup), month by tier (sphere-touch-plan). Deadlines → timeline.
content-opportunity-research already has `scripts/` and a brief template: map the brief template's parts to
sections and keep its spend and budget lines in `meta` and `dataCheck`.

### Wave 3: Partial Fits (Only After Connor Reviews Waves 1 And 2)

expired-fsbo-outreach, ai-brain-setup, team-ai-brain, team-playbook-builder, offer-strategy,
repair-request-response, seller-listing-update, open-house-follow-up, inbox-meeting-follow-through,
post-closing-client-care, perfect-week (needs a new `weekgrid` section kind added to `_page-kit` once, with a
test), market-update-email. Paste blocks become `drafts` with `channel` naming where to paste.

### Do Not Convert

speed-to-lead-reply, listing-description-writer, appointment-follow-up: speed or paste-ready text is the job.

## Part 3: Acceptance Tests (The PR Is Done When All Pass)

1. `python3 skills/_page-kit/tests/run_tests.py`: 14 of 14.
2. `node scripts/skills.mjs check` and `node scripts/skills.mjs build` pass; the downloads drift test passes; the
   repo's CI suite passes.
3. Every converted skill: its sample page builds from its practice files with no STOPPED, no CHECK THESE NUMBERS,
   and no dash NOTE; it opens offline (no `http` or `https` in any `src` or `href`); it is one file.
4. Screenshots at 1280 px and 390 px for every converted skill, committed, and listed in the PR description
   with one line each on what the page shows. Print to PDF fits Letter with no section cut mid-row.
5. A grep of every changed file under `skills/` finds no em dash (U+2014) and no en dash (U+2013).
6. Each ChatGPT version still has 4 files or fewer, and its `instructions.md` names `page-kit.md` exactly.
7. The PR description lists: skills converted, skills skipped and why, any SKILL.md over 150 lines, anything in
   this brief that conflicted with the repo, and the open questions below.

## Open Questions For Connor (Put Them In The PR Description)

- Should team-pnl-review stay now that Map Your Spend covers the same books with a designed page?
- Map Your Spend and Lead Source Review are not in the repo (their zips live in the course handoff). Bring them in
  as library skills, or keep them course-only?
- Scheduled hires: until Drive "create file" is proven to accept `.html` in a scheduled run, hires deliver the
  Gmail draft and the page is built on demand.

---

## Appendix A: The Framing Spec (HTML-OUTPUT-FRAMING.md, In Full)

````markdown
# HTML Output Framing: How A Skill Hands Back A Page

Draft v1, Nov 23, 2026. Extracted from Map Your Spend (the `.skill` Connor sent on Nov 23, unpacked at
`/tmp/skillx/map-your-spend/`, same build as `cohort-build/week1-videos/skill/`). Lead Source Review already
follows the same pattern. This spec is what every other skill converts to. Nothing here is live.

## 1. The Idea In One Paragraph

Instead of a long reply in the chat thread, the skill hands back **one polished HTML file** the owner can open,
sift and print: the bottom line first, then one row per question with the finding on the left and the proof on
the right, every table sortable and searchable, every draft one click to copy, and a Check Before Sending list
they can tick. The chat itself shrinks to four short lines and the file. The page is the same layout for every
team and every run, so owners learn to read it once.

## 2. Who Does What (The Split Is The Point)

| Who | Does | Never |
|---|---|---|
| **Scripts** (Python, standard library) | Count, add, prorate, judge against the standard, rank. Write `facts.json` / `scored.json`, which already holds default sentences so the page is complete with no model words. | Guess. A script that cannot add something up stops with a plain error and writes nothing. |
| **The model** | Reads the user's files, sorts and maps them (the judgment a script cannot make), asks the owner about anything it cannot place (`ASK`), then writes a short `words.json`: headline, findings, up to three moves, an optional decision line, optional section sentences. | Do math in its head, adjust a script's result, open or restyle the template, or write a number that is not in the facts. |
| **The build script** (`build_page.py`, or a skill's own `build_report.py`) | Merges words into the page JSON, runs the protective checks, and pours it into the template's one data slot. Writes ONE self-contained `.html`. | Rewrite the template. |
| **The template** (`base-template.html`, or a skill's own `report-template.html`) | Draws everything from the JSON with text-only DOM calls (no `innerHTML`), so a client name with a `<` in it can never break the page. | Change from team to team. |

Map Your Spend's own words: "A report built without them is a guess with a logo on it."

### The Build Refuses (Map Your Spend's Three Guards, Generalized)

1. **Verdicts must match the facts.** A headline must declare which lines it is about and the verdict the
   script gave (`headline_about`). It can never call a line that is off "healthy", "close", "fine" or "on track".
   (Skill-specific: put this in the skill's own build when it has graded lines. The shared build does the generic checks below.)
2. **Every move is tied to something off or on watch,** and its dollar size comes from the data, never from the sentence.
3. **Every number in a sentence must exist in the facts.** Strays stop the build and are listed.
4. **Warnings ride along.** Every warning the scoring script raised prints in a red Data Check banner at the top.
   A words file cannot remove it. Only fixing the cause and running again does.

## 3. The Words JSON Contract

The model writes this and nothing else. Every key is optional; leave one out and the script's default stays.

```json
{
  "headline": ["Profit is 11.5 points short.", "Portal fees are the biggest gap."],
  "headline_about": [{"line": "noi", "verdict": "off"}],
  "findings": [{"status": "off", "text": "Net operating income is 18.5% of GCI against a 30% standard."}],
  "moves": [{"title": "Check Splits And Fees By Lead Source", "text": "Closing the gap is worth $108,000 a year.", "tag": "Company Dollar", "size": "$108,000 a year", "owner": ""}],
  "decide": "Staffing rose 4.7 points in November. One-month swing, or a change to act on?",
  "sections": {"<section id>": {"finding": "...", "note": "...", "drafts": [ ... ]}}
}
```

- **headline:** one or two short sentences, about six words each. The verdict, then where the biggest gap is.
- **findings:** three (four at most), most important first. `status` is `on`, `off`, `hold` (shows as Watch) or `quiet` (No Data) and must match the facts.
- **moves:** up to three, imperative Title Case title, one or two sentences of how. `owner` is a real name only when someone was named; otherwise `""` and the owner types a name on the page.
- **decide:** one decision line, only on runs that have one (monthly runs).
- **sections:** a sentence that reads wrong for this team. Keys are the section `id`s on the page.

Map Your Spend and Lead Source Review keep their own richer contracts (`actions` with `line`, `headline_about`). New skills use the shape above.

## 4. The Page JSON (What The Template Draws)

Written by the skill's script (preferred), or by the model when a skill has no script (see section 9).

```json
{
  "id": "team-pnl-review:northline:2026-11",
  "report": "Team P&L Review",
  "subtitle": "Northline Realty, January to September 2026",
  "sample": "Practice File: Made-Up Example",
  "meta": [{"label": "Team", "value": "Northline Realty"}, {"label": "Period", "value": "Jan to Sep 2026"}],
  "dataCheck": ["Income adds up to $412 less than the P&L total line."],
  "headline": ["..."], "findings": [], "moves": [], "decide": "",
  "sections": [
    {"id": "mix", "kind": "table", "label": "Expense Mix", "finding": "...", "note": "...", "math": ["..."],
     "columns": [{"key": "acct", "label": "Account", "type": "text"}, {"key": "amt", "label": "Amount", "type": "usd"}],
     "rows": [{"acct": "Advertising", "amt": 48210, "_status": "off"}], "filters": ["acct"], "sort": {"key": "amt", "dir": "desc"}, "limit": 25}
  ],
  "stamp": "Team P&L Review", "closing": "One closing sentence.", "lockup": "Brought to you by Amplified Impact"
}
```

**Section kinds** (shared template): `tiles` (big numbers with status chips), `table` (sort, search, filter,
Show All Rows, row status bars), `list` (status chip, title, text, optional math), `timeline` (dated steps),
`drafts` (each draft with To, channel, Title Case subject, body, Copy Draft button, optional flag line),
`checklist` (Check Before Sending, tick boxes remembered in the browser), `prose` (short paragraphs).
Column `type`: `text`, `num`, `usd`, `pct`, `status`; `sortKey` sorts a text column by another field.
Every section can carry `math` (lines shown behind Show The Math, always expanded in print).
Need a new kind (a chart)? Add it to the shared template once, for every skill. Never per skill.

## 5. Template Structure And Design System

**Order on the page:** lockup ("Brought to you by Amplified Impact") → red Data Check banner (only if warnings)
→ header (skill name eyebrow, sample chip, Copy Summary, Print Or Save As PDF) → meta strip → section links
(4+ sections) → **Bottom Line** (huge headline; What We Found with chips; dark First Moves panel with editable
Owner fields; Decide) → one row per section (rail on the left: eyebrow label, one-sentence finding, note; proof on
the right) → end block (stamp, closing, sample line, "nothing you do here changes your numbers or sends anything")
→ lockup.

**Design (Amplified Impact Web):** Bone ground `#f1f0eb`, raised `#fafaf7`, Black ink `#0a0d0c`, ink-2 `#4d5350`,
Forest accent `#1f4d40`, hairlines `#dad8d0`. Status: good `#1f8a5c`, hold `#a88400`, bad `#a82a2a`, each with a
soft wash for chips. Flat surfaces, hairlines, no shadows, no rounded corners. Data wears one hue; green and red
appear only where something is on or off. Dark mode follows the system (`prefers-color-scheme`), mint accent
`#6fd3a5`. Mono uppercase eyebrows with wide tracking; big tight headline (up to 68 px); tabular numbers.

**Fonts:** Geist and Geist Mono (400 and 500), embedded as base64 woff2 so the page looks the same offline.
License: SIL Open Font License 1.1, Copyright (c) 2023 Vercel with basement.studio. OFL allows embedding and
redistribution; ship `FONT-LICENSE.txt` beside the template in every skill zip (Map Your Spend does). Fallback
stack: system-ui, -apple-system, Segoe UI; mono: ui-monospace, SF Mono, Menlo, Consolas. The **lite build**
(no embedded fonts, ~30 KB) is for ChatGPT Projects and anywhere file size matters.

**Interactivity (all local, nothing sent):** editable Owner fields on moves, saved in `localStorage` under a key
built from the page id; Check Before Sending boxes, same; Copy Summary (plain-text summary incl. owners, with a
"copy by hand" fallback when the clipboard is blocked); Copy Draft per draft; sortable, searchable, filterable
tables; Show The Math toggles; hover and keyboard tooltips (Map Your Spend). Names typed on the page stay in that
browser only: to make one permanent, put it in `words.json` and build again.

**Print:** Letter, 0.55 in margins, white ground, zoom about 0.7 to 0.78, buttons and search hidden, every math
block expanded, every hidden table row shown, nothing split across a page break. "Print Or Save As PDF" is the
PDF path. Responsive at 979 px and 639 px; 44 px tap targets on touch.

**Safety in the file:** one JSON data block, `</` and `<!--` escaped; text-only rendering; no external URLs, no
fetch, no analytics. Accessible: `aria` labels on sections, `role=alert` banner, `aria-sort`, `aria-expanded`.

## 6. File Naming, Where It Is Saved, How It Is Handed Over

**Name:** `<Skill-Name>-<Subject>-<YYYY-MM>.html`, Title Case words joined by hyphens, no spaces, for example
`Map-Your-Spend-Northline-Realty.html`, `Team-PnL-Review-Northline-Realty-2026-09.html`,
`Agent-1on1-Prep-Marigold-Fizzwhistle-2026-11-12.html` (meeting-dated skills use the full date). A re-run for
the same subject and period keeps the same name so it replaces the old one. Sample runs end in `-Sample`.

**Work folder:** a new empty folder per run, never inside the skill folder. Every script prints the full path of
each file it writes; hand over the path it printed.

**Claude (claude.ai web, desktop, mobile):** needs Settings > Capabilities > Code execution and file creation
("Create and edit files" in the new layout). Save the final page to Claude's outputs folder so it appears as a
downloadable file card in the chat (`/mnt/user-data/outputs/` in the current sandbox; confirm on screen during
the pilot). The owner downloads and double-clicks it, or saves it to Google Drive from the file card. Do not
re-create the page as a Claude artifact: the artifact viewer blocks page-started downloads and may not keep
`localStorage`. Team plans: an owner may have turned code execution off; the skill stops and says so.
Scheduled hires (Claude scheduled tasks): save the `.html` to `AI Office / <Skill> / reports` with the Drive
connector and put the file link in the Gmail draft (test that Drive "create file" accepts a `.html` before
promising it; if it only makes Docs, save the HTML as a file upload or fall back to a Doc plus the summary).

**ChatGPT:** two install shapes, and the page works in both only when code runs.
- *Skill upload* (Business, Enterprise, Edu, Healthcare, with skills and skill uploading on; also standalone
  skills in the ChatGPT desktop app and Codex): the same zip as Claude, `scripts/` and `assets/` included.
- *ChatGPT Project version* (any signed-in plan, the library's standard since custom GPTs retire Dec 11, 2026):
  4 files max (instructions, paste text, up to 3 `.md`). The kit rides as one `page-kit.md`
  (`shared/chatgpt-kit/page-kit.md`, built by `make_chatgpt_kit.py`): the model saves the two blocks to files in
  its code tool and runs the build with `--fonts none` (lite build).
- **What ChatGPT can do:** run Python in its code tool (Code Interpreter / data analysis), write the `.html` to
  `/mnt/data`, and show a `sandbox:/mnt/data/<file>.html` download link. **What it can't:** keep that file. The
  code session resets after inactivity (OpenAI documents 20 minutes for the API container), so links go dead.
  The chat must tell the person to download now, and on a dead link, re-run the build for a fresh link. Mobile
  sometimes shows the link as plain text: open the chat on the web. ChatGPT does not render the page inline.
  Printing a 30 to 200 KB HTML into a chat block is not a fallback. Scheduled ChatGPT tasks and whether they
  run code or save to Drive are unproven (the course's Tests C and D): until they pass, hires on ChatGPT deliver
  the Gmail draft summary, and the page is built on demand.

**The chat message after the file (four lines, no more):** the headline, the one number that matters, the first
move, and "check every number against your files before you act." Then offer a re-run and any schedule.

## 7. No-Code Fallback Rules

- Check once, before asking for any file: run the skill's `--help` (or `python3 -c "print(1)"`).
- **Skills whose numbers come from scripts** (Map Your Spend, Lead Source Review, anything with a `score.py`):
  no code means **stop** and tell the person how to turn code execution on. Never estimate, never hand-build HTML,
  never paste a text version of the report. A failed script is fixed and re-run, never worked around.
- **Skills with no math** (drafting, document review): if code is off, give the same sections as plain chat text
  in the same order (Bottom Line, sections, drafts, Check Before Sending), and say one line: "Turn on code
  execution to get this as a page you can sort and print." The content is identical; only the wrapper differs.
- Never hand-write the HTML file in chat. The page only exists if the build script made it.

## 8. Copy Rules (Checked By The Build Where A Machine Can)

- No em dashes or en dashes anywhere, including drafts and file names. Use a comma, colon, parentheses or "to". (Build replaces them and notes it.)
- Title Case for headings: report name, section labels, move titles, tile and column labels, meta labels, draft subjects. (Build stops.)
- No invented numbers: every number in a sentence comes from the facts or the user's files. (Build stops on strays.)
- Never "industry standard" (or industry average or benchmark). Typical is what teams spend; the standard is Connor's bar. (Build stops.)
- MT after every clock time: "12:00 PM MT". (Build stops on a time without it. `--tz-label` only for a skill run outside Mountain time, labeled.)
- Hires read and draft only: no sentence may say the page or hire sent, posted, emailed or changed the books or the CRM. Outgoing words are drafts with a Copy Draft button and a Check Before Sending list. (Build stops.)
- Plain words, short sentences, talk to the owner as "you". Say what to do, not what to consider. If something is on the standard, say so; never invent a problem to fill a slot.
- Client-facing drafts: no "stunning", "dream home", "don't hesitate to reach out". (Build stops.)
- Made-up data says so: `"sample"` set, a chip at the top and a line at the end.
- Privacy: never card, bank, routing, loan or Social Security numbers. Agent-only MLS fields never in client drafts. A page that holds client names says in its subtitle that it is internal. Lists with phone numbers stay in their CSV, not the page.

## 9. Skills Without Scripts

Most library skills do their math inline (code copied from `references/*-code.md`) and write the answer in chat.
To convert one without writing a full scoring engine:
1. Keep the inline analysis code, but make it end by writing `facts.json` (every number the output uses).
2. The model writes `page.json` (sections in the skill's existing "Output, In This Order") and `words.json`.
3. Build with `--facts facts.json --inputs <the user's files>` so every number in the page traces back.
4. Graduate to a real `scripts/` folder only for skills used weekly or on a schedule.

## 10. Converting A Skill: Checklist

1. [ ] Map the skill's "Output, In This Order" to page parts: Bottom Line (headline, findings, moves), then one section per item, drafts into one `drafts` section, Check Before Sending into a `checklist` section (always last).
2. [ ] Decide the source of every number: a script's `facts.json` (preferred) or the inputs.
3. [ ] Copy `shared/scripts/build_page.py`, `shared/assets/base-template.html`, `fonts.css`, `FONT-LICENSE.txt` into the skill (`scripts/`, `assets/`). Do not fork the template.
4. [ ] Add a short "Hand It Back As A Page" step to SKILL.md (text in `shared/SKILL-SNIPPET.md`), and a "Before You Start: Code" line saying whether no-code means stop or plain text.
5. [ ] Update "Output, In This Order" to say the page holds the sections and the chat gets four lines.
6. [ ] Write a sample `page.json` + `words.json` from the skill's practice files; build it; screenshot at 1280 px and 390 px; print to PDF.
7. [ ] Tests: the shared kit's 14 checks pass; add the skill's own (the right sections appear, numbers match a hand-checked practice run, no client data where it should not be).
8. [ ] ChatGPT: Project version gets `page-kit.md` as one of its 3 extra files (merge references if needed to stay at 4 files); `instructions.md` gets the ChatGPT hand-over lines (download now, re-run for a fresh link).
9. [ ] Re-run the skill's evals; update `sample.md` and `page-notes.md` ("What comes back: a page you can sort and print").
10. [ ] Copy rules pass (build output clean, no NOTE about dashes left in source files).
````

## Appendix B: scripts/build_page.py

```python
#!/usr/bin/env python3
"""
build_page.py: the shared last step for every Amplified Impact skill that hands back a page.

It drops one page JSON into the shared template and writes ONE self-contained HTML file:
styles, fonts, script and data all inside, nothing fetched from the web. The template is
never rewritten, so every skill and every team gets the same layout.

Usage:
    python build_page.py page.json --out Team-PnL-Review-Northline-2026-11.html
    python build_page.py page.json --words words.json --facts scored.json --out <file>.html
    python build_page.py page.json --inputs export.csv notes.txt --out <file>.html   (no-script skills)
    python build_page.py --check-only page.json --words words.json                    (validate, write nothing)

page.json   the page: written by the skill's own script (preferred) or by the model when
            the skill has no script. Shape: see HTML-OUTPUT-FRAMING.md, "The Page JSON".
words.json  optional. The sentences that need judgment, written by the model. Replaces the
            headline, findings, moves, decide, and any section's finding or note.
--facts     optional, repeatable. JSON files the skill's scripts wrote. Every number in the
            words must appear in them (or in page.json). Strays stop the build.
--inputs    optional, repeatable. The user's own files (CSV, TXT, MD, JSON). For skills
            without scripts, numbers in the page may come from these too.

Checks that STOP the build (exit 1), each with a plain message:
  1. Shape: report name, a headline of one or two sentences, known section kinds and statuses.
  2. Banned words: "industry standard", "industry average"; client-facing filler
     ("stunning", "dream home", "don't hesitate to reach out").
  3. A sentence that claims the page sent, posted or changed something. Hires read and draft only.
  4. A number in the words that is not in the facts, the page data or the inputs.
  5. A clock time with no "MT" after it (pass --tz-label to change the label).
  6. A heading, section label, move title or draft subject that is not in Title Case.
Fixed with a NOTE (build goes on): em and en dashes in any text become commas or "to".
Standard library only. Python 3.7 or later.
"""
import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SLOT_DATA, SLOT_FONTS, SLOT_TITLE = "/*PAGE_DATA*/", "/*FONTS*/", "/*PAGE_TITLE*/"
KINDS = {"table", "tiles", "list", "timeline", "drafts", "checklist", "prose"}
STATUSES = {"on", "off", "hold", "quiet", ""}
NUMBER = re.compile(r"(?<![A-Za-z])\$?\d[\d,]*(?:\.\d+)?%?")
TIME = re.compile(r"\b(1[0-2]|0?[1-9])(?::[0-5]\d)?\s?(AM|PM|am|pm|a\.m\.|p\.m\.)")
BANNED = [
    (re.compile(r"\bindustry[- ](standard|average|benchmark|norm)s?\b", re.I),
     'Never say "%s". Typical is what teams spend. The standard is Connor\'s bar.'),
    (re.compile(r"\b(stunning|dream home)\b", re.I), 'Client-facing filler "%s" is not allowed.'),
    (re.compile(r"don.t hesitate to reach out", re.I), 'Client-facing filler "%s" is not allowed.'),
]
ACTED = re.compile(r"\b(I|we|this page|the hire|it)\s+(have\s+|has\s+|'ve\s+)?(sent|emailed|texted|posted|published|"
                   r"updated the (books|crm|ledger)|changed the (books|crm|ledger)|deleted|scheduled the send)\b", re.I)
SMALL = {"a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "nor", "of", "on", "or", "per",
         "the", "to", "vs", "via", "with", "your", "you", "is", "it", "its", "if", "up", "out", "off", "so"}
SAFE_NUMBERS = {str(n) for n in range(0, 13)} | {"30", "60", "90", "100", "24", "48", "365", "2025", "2026", "2027"}


def norm(token):
    t = token.replace(",", "").replace("$", "").replace("%", "")
    if "." in t:
        t = t.rstrip("0").rstrip(".")
    return t


def numbers_in(text):
    return {norm(m) for m in NUMBER.findall(text or "") if norm(m)}


def clean(text, notes):
    """House style: no em dashes or en dashes."""
    if not isinstance(text, str):
        return text
    out = re.sub(r"(?<=\d)\s*[\u2013\u2014]\s*(?=\d)", " to ", text)
    out = out.replace(" \u2014 ", ", ").replace("\u2014", ", ").replace(" \u2013 ", ", ").replace("\u2013", "-")
    if out != text:
        notes.append("Dashes replaced in: %s" % text[:70])
    return out


def deep_clean(node, notes):
    if isinstance(node, dict):
        return {k: deep_clean(v, notes) for k, v in node.items()}
    if isinstance(node, list):
        return [deep_clean(v, notes) for v in node]
    return clean(node, notes)


def is_title_case(text):
    words = re.findall(r"[A-Za-z][A-Za-z'\u2019.-]*", text or "")
    for i, w in enumerate(words):
        if i and w.lower() in SMALL:
            continue
        if w[0].islower():
            return False
    return True


def texts(page):
    """Every string a person reads, with where it sits."""
    out = []

    def walk(node, where):
        if isinstance(node, dict):
            for k, v in node.items():
                if k.startswith("_") or k in ("key", "type", "kind", "id", "status"):
                    continue
                walk(v, where + "." + k)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, "%s[%d]" % (where, i))
        elif isinstance(node, str):
            out.append((where, node))
    walk(page, "page")
    return out


def headings(page):
    """Strings that must be Title Case: labels, move titles, list titles, draft subjects, column labels."""
    out = [("report", page.get("report", ""))]
    for m in page.get("moves") or []:
        out.append(("move title", m.get("title", "")))
    for s in page.get("sections") or []:
        out.append(("section label", s.get("label", "")))
        for c in s.get("columns") or []:
            out.append(("column", c.get("label", "")))
        for t in s.get("tiles") or []:
            out.append(("tile label", t.get("label", "")))
        for d in s.get("drafts") or []:
            if d.get("subject"):
                out.append(("draft subject", d["subject"]))
            out.append(("draft label", d.get("label", "")))
    for m in page.get("meta") or []:
        out.append(("meta label", m.get("label", "")))
    return [(w, t) for w, t in out if t]


def apply_words(page, words, problems):
    if "headline" in words:
        hl = words["headline"]
        page["headline"] = [hl] if isinstance(hl, str) else list(hl or [])
    for k in ("findings", "moves", "decide", "dataCheckNote"):
        if k in words:
            page[k] = words[k]
    by_id = {s.get("id"): s for s in page.get("sections") or []}
    for sid, patch in (words.get("sections") or {}).items():
        if sid not in by_id:
            problems.append("words names section '%s', which is not on the page. Sections: %s" % (sid, ", ".join(str(k) for k in by_id)))
            continue
        for f in ("finding", "note"):
            if isinstance(patch, dict) and patch.get(f):
                by_id[sid][f] = patch[f]
        if isinstance(patch, dict) and patch.get("drafts") and by_id[sid].get("kind") == "drafts":
            by_id[sid]["drafts"] = patch["drafts"]


def check_shape(page, problems):
    if not str(page.get("report") or "").strip():
        problems.append('page needs "report": the skill name people see, for example "Team P&L Review".')
    hl = page.get("headline")
    if not isinstance(hl, list) or not (1 <= len([x for x in hl if str(x).strip()]) <= 2):
        problems.append("headline must be one or two short sentences.")
    for f in page.get("findings") or []:
        if str(f.get("status", "")) not in STATUSES:
            problems.append("finding status must be on, off, hold or quiet. Got %r" % f.get("status"))
    if len(page.get("findings") or []) > 4:
        problems.append("at most four findings. Pick the ones worth the most.")
    if len(page.get("moves") or []) > 3:
        problems.append("at most three moves. Three things to do this week, not a list.")
    seen = set()
    for i, s in enumerate(page.get("sections") or []):
        if s.get("kind") not in KINDS:
            problems.append("section %d has kind %r. Use one of: %s" % (i, s.get("kind"), ", ".join(sorted(KINDS))))
        sid = s.get("id") or str(i)
        if sid in seen:
            problems.append("two sections share the id '%s'." % sid)
        seen.add(sid)
    if not any(s.get("kind") == "checklist" for s in page.get("sections") or []) and any(
            s.get("kind") == "drafts" for s in page.get("sections") or []):
        problems.append('a page with drafts needs a "checklist" section (Check Before Sending) listing every date, '
                        "dollar amount, name and quoted fact in the drafts.")


def main():
    ap = argparse.ArgumentParser(description="Fill the shared Amplified Impact page template.")
    ap.add_argument("page", help="page JSON")
    ap.add_argument("--words", help="optional words JSON written by the model")
    ap.add_argument("--facts", action="append", default=[], help="JSON the skill's scripts wrote (repeatable)")
    ap.add_argument("--inputs", nargs="*", default=[], help="the user's own text files, for skills without scripts")
    ap.add_argument("--out", help="where to write the HTML")
    ap.add_argument("--template", default=os.path.join(HERE, "..", "assets", "base-template.html"))
    ap.add_argument("--fonts", default=os.path.join(HERE, "..", "assets", "fonts.css"),
                    help="embedded font CSS. Missing file means system fonts (the lite build).")
    ap.add_argument("--tz-label", default="MT", help='the label every clock time needs after it (default "MT")')
    ap.add_argument("--allow-number", action="append", default=[], help="a number the skill's standard uses, always fine")
    ap.add_argument("--check-only", action="store_true", help="run every check and write nothing")
    args = ap.parse_args()

    def load(path, what):
        if not os.path.exists(path):
            sys.exit("BUILD STOPPED. There is no %s at %s." % (what, os.path.abspath(path)))
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    page = load(args.page, "page file")
    notes, problems, warnings = [], [], []
    if args.words:
        apply_words(page, load(args.words, "words file"), problems)
    page = deep_clean(page, notes)
    check_shape(page, problems)

    # numbers: facts and inputs are the only places a number may come from
    allowed = set(SAFE_NUMBERS) | {norm(n) for n in args.allow_number}
    for fp in args.facts:
        allowed |= numbers_in(json.dumps(load(fp, "facts file"), ensure_ascii=False))
    for ip in args.inputs:
        if os.path.exists(ip):
            with open(ip, encoding="utf-8", errors="ignore") as f:
                allowed |= numbers_in(f.read())
        else:
            warnings.append("Input file not found, so its numbers were not loaded: %s" % ip)
    data_numbers = numbers_in(json.dumps({k: v for k, v in page.items() if k not in ("headline", "findings", "moves", "decide")}, ensure_ascii=False))
    written = ""
    if args.words:
        written = json.dumps(load(args.words, "words file"), ensure_ascii=False)
        allowed |= data_numbers  # model sentences may repeat what the scripts put on the page
    elif args.facts or args.inputs:
        written = json.dumps(page, ensure_ascii=False)  # model wrote the whole page: everything must trace
    strays = sorted(numbers_in(written) - allowed, key=lambda t: float(t) if re.match(r"^\d+(\.\d+)?$", t) else 0)
    if strays and (args.facts or args.inputs):
        problems.append("These numbers are in the sentences but not in the facts or the inputs: %s. "
                        "Fix the sentence or take the number out. Never leave a figure the data does not support." % ", ".join(strays))
    elif strays:
        warnings.append("No --facts or --inputs given, so numbers were not traced. Pass them on a real run.")

    for where, t in texts(page):
        for rx, msg in BANNED:
            m = rx.search(t)
            if m:
                problems.append((msg % m.group(0)) + " At %s." % where)
        if ACTED.search(t) and ".drafts" not in where:
            problems.append('"%s" says something was sent, posted or changed. Hires read and draft only. At %s.' % (t[:80], where))
        for m in TIME.finditer(t):
            tail = t[m.end():m.end() + 12]
            if not re.match(r"\s*(%s|Mountain)" % re.escape(args.tz_label), tail):
                problems.append('The time "%s" needs "%s" after it. At %s.' % (m.group(0), args.tz_label, where))
    for where, t in headings(page):
        if not is_title_case(t):
            problems.append('The %s "%s" is not in Title Case.' % (where, t))

    if problems:
        sys.stderr.write("BUILD STOPPED. Fix these and run again:\n")
        for p in dict.fromkeys(problems):
            sys.stderr.write("  - %s\n" % p)
        sys.exit(1)
    if args.check_only:
        print("CHECKS PASSED. Nothing written (--check-only).")
        for n in notes + warnings:
            print("NOTE: %s" % n)
        return
    if not args.out:
        sys.exit("Say where to write the page with --out.")

    with open(args.template, encoding="utf-8") as f:
        template = f.read()
    for slot in (SLOT_DATA, SLOT_FONTS, SLOT_TITLE):
        if slot not in template:
            sys.exit("The template is missing %s. Use the base-template.html that ships with the skill." % slot)
    fonts = ""
    if args.fonts and os.path.exists(args.fonts):
        with open(args.fonts, encoding="utf-8") as f:
            fonts = f.read()
    else:
        notes.append("No font file found, so the page uses system fonts (the lite build). It still works offline.")
    payload = json.dumps(page, ensure_ascii=False).replace("</", "<\\/").replace("<!--", "<\\!--")
    title = re.sub(r"[<>&]", "", page.get("report", "Report"))
    html = template.replace(SLOT_FONTS, fonts).replace(SLOT_TITLE, title).replace(SLOT_DATA, payload)
    out_dir = os.path.dirname(os.path.abspath(args.out))
    if not os.path.isdir(out_dir):
        os.makedirs(out_dir)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(html)
    kinds = [s.get("kind") for s in page.get("sections") or []]
    print("BUILT %s (%d KB)" % (os.path.abspath(args.out), round(len(html.encode("utf-8")) / 1024)))
    print("One self-contained file. It opens offline, with nothing fetched from the web.")
    print("Sections: bottom line, %s" % ", ".join("%s (%s)" % (s.get("label"), s.get("kind")) for s in page.get("sections") or []) if kinds else "Sections: bottom line")
    if page.get("dataCheck"):
        print("DATA CHECK: %d warning(s) print in a red banner at the top. Fix the cause before handing it over." % len(page["dataCheck"]))
    for n in notes + warnings:
        print("NOTE: %s" % n)
    if page.get("sample"):
        print("This page is marked as a sample with made-up data.")
    print("A person should check every number against the source files before anyone acts on it.")


if __name__ == "__main__":
    main()
```

## Appendix C: scripts/make_chatgpt_kit.py

```python
#!/usr/bin/env python3
"""
make_chatgpt_kit.py: packs the shared page kit into ONE markdown file for a ChatGPT Project.

A ChatGPT Project version holds 4 files (instructions, paste text, up to 3 more .md files) so it fits
ChatGPT Free's 5-file limit. The page kit has to ride in one of those .md files. This writes
page-kit.md: build_page.py and the LITE template (system fonts, no embedded Geist, so it stays small),
each in its own fenced block, with the two lines the model runs to unpack them.

Usage: python make_chatgpt_kit.py --out ../chatgpt-kit/page-kit.md
"""
import argparse, os
HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument("--out", default=os.path.join(HERE, "..", "chatgpt-kit", "page-kit.md"))
a = ap.parse_args()
build = open(os.path.join(HERE, "build_page.py"), encoding="utf-8").read()
tpl = open(os.path.join(HERE, "..", "assets", "base-template.html"), encoding="utf-8").read()
fence = "~~~~~~"
body = """# Page Kit (for building the report page)

Use this file only when the instructions say to build the page. In code (Python), save the first block
below as build_page.py and the second as base-template.html, in the same folder, exactly as written.
Do not change either file. Then run:

    python build_page.py page.json --words words.json --facts facts.json --template base-template.html --fonts none --out <File-Name>.html

and give the person the download link for the .html file right away. The link stops working when the
code session ends, so tell them to download it now. If the link fails, run the code again for a new link.

## build_page.py

%(f)spython
%(build)s
%(f)s

## base-template.html

%(f)shtml
%(tpl)s
%(f)s
""" % {"f": fence, "build": build.rstrip(), "tpl": tpl.rstrip()}
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
open(a.out, "w", encoding="utf-8").write(body)
print("WROTE %s (%d KB)" % (os.path.abspath(a.out), round(len(body.encode()) / 1024)))
```

## Appendix D: assets/base-template.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>/*PAGE_TITLE*/</title>
<style>
/*FONTS*/
</style>
<style>
/* Amplified Impact shared report page. One template for every skill.
   Bone ground, Black ink, Forest accent, flat surfaces, hairlines, no shadows.
   Layout: the bottom line first, then one row per question, the finding on the left and the proof on the right.
   Green and red appear only where something is on or off. Everything a run changes lives in the JSON block below.
   Never restyle this file per skill: add a section kind here once, for every skill. */
:root {
  color-scheme: light;
  --surface: #f1f0eb; --raised: #fafaf7; --ink: #0a0d0c; --ink-2: #4d5350; --ink-3: #5e6461;
  --accent: #1f4d40; --line: #dad8d0; --line-2: #7c8580; --track: #dedcd3;
  --good: #1f8a5c; --good-ink: #1f4d40; --hold: #a88400; --hold-ink: #5f4a00; --bad: #a82a2a; --bad-ink: #7a1f14;
  --good-wash: color-mix(in srgb, var(--good) 14%, var(--surface));
  --hold-wash: color-mix(in srgb, var(--hold) 18%, var(--surface));
  --bad-wash: color-mix(in srgb, var(--bad) 12%, var(--surface));
  --dark-bg: #0a0d0c; --dark-ink: #f1f0eb; --dark-ink-2: #a3aba7; --dark-accent: #6fd3a5; --dark-line: #262d2a;
  --sans: "Geist", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
}
@media screen and (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --surface: #0a0d0c; --raised: #111614; --ink: #f5f5f2; --ink-2: #a3aba7; --ink-3: #7c8580;
    --accent: #6fd3a5; --line: #1e2522; --line-2: #5c6762; --track: #232b28;
    --good: #6fd3a5; --good-ink: #6fd3a5; --hold: #e8c547; --hold-ink: #f0d57a; --bad: #f0705c; --bad-ink: #ffa392;
    --good-wash: color-mix(in srgb, var(--good) 20%, var(--surface));
    --hold-wash: color-mix(in srgb, var(--hold) 24%, var(--surface));
    --bad-wash: color-mix(in srgb, var(--bad) 24%, var(--surface));
    --dark-bg: #111614; --dark-line: #1e2522;
  }
}
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body { margin: 0; background: var(--surface); color: var(--ink); font: 400 16px/1.55 var(--sans); -webkit-font-smoothing: antialiased; }
h1, h2, h3, p, ul, ol, dl, dd, figure { margin: 0; padding: 0; }
ul, ol { list-style: none; }
button, input { font: inherit; color: inherit; }
.page { max-width: 1180px; margin: 0 auto; padding: 0 32px 56px; }
.label, .eyebrow { font: 400 12px/1.4 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-2); }
.eyebrow { color: var(--accent); }
.lockup { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--line); }
.lockup-end { border-bottom: 0; border-top: 1px solid var(--line); margin-top: 40px; }
.lockup-by { font: 400 12px/1.4 var(--mono); letter-spacing: .16em; text-transform: uppercase; color: var(--ink-2); }
.wordmark { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; letter-spacing: -0.01em; }
.mark { width: 18px; height: 18px; }
.top { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 28px 0 14px; flex-wrap: wrap; }
.top-act { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.btn { height: 36px; padding: 0 14px; border: 1px solid var(--ink); background: transparent; border-radius: 0; cursor: pointer; font-size: 14px; }
.btn:hover { background: var(--ink); color: var(--surface); }
.btn:focus-visible, .owner-in:focus-visible, .tbl-search:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (pointer: coarse) { .btn { height: 44px; } }
.sample { font: 500 12px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; padding: 8px 10px; background: var(--hold-wash); color: var(--hold-ink); }
.note-line { padding: 0 0 14px; color: var(--ink-2); font-size: 14px; }
.strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); border-top: 2px solid var(--ink); border-bottom: 1px solid var(--line); }
.strip > div { padding: 14px 16px 16px 0; }
.strip dd { margin-top: 4px; font-size: 17px; font-weight: 500; }
.data-check { margin: 18px 0 0; padding: 16px 18px; background: var(--bad-wash); border-left: 4px solid var(--bad); }
.data-check-label { display: flex; gap: 8px; align-items: center; font: 500 13px/1.4 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--bad-ink); }
.data-check li { margin-top: 6px; list-style: disc; margin-left: 20px; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; font: 500 11px/1.4 var(--mono); letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
.chip svg { width: 12px; height: 12px; }
.chip.on { background: var(--good-wash); color: var(--good-ink); }
.chip.off { background: var(--bad-wash); color: var(--bad-ink); }
.chip.hold { background: var(--hold-wash); color: var(--hold-ink); }
.chip.quiet { background: var(--track); color: var(--ink-2); }
.bottom { padding: 40px 0 44px; border-bottom: 2px solid var(--ink); }
.headline { margin-top: 10px; font-size: clamp(36px, 6vw, 68px); line-height: 1.02; letter-spacing: -0.035em; font-weight: 500; max-width: 18ch; }
.summary { display: grid; grid-template-columns: repeat(12, 1fr); gap: 28px; margin-top: 36px; }
.found { grid-column: span 5; }
.found.wide { grid-column: span 12; }
.found li { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; padding: 14px 0; border-top: 1px solid var(--line); }
.moves { grid-column: span 7; background: var(--dark-bg); color: var(--dark-ink); padding: 28px 30px 16px; }
.moves .label { color: var(--dark-ink-2); }
.moves li { display: grid; grid-template-columns: 40px 1fr; gap: 10px; padding: 16px 0; border-top: 1px solid var(--dark-line); }
.moves li:first-child { border-top: 0; }
.idx { font: 500 14px/1.6 var(--mono); color: var(--dark-accent); }
.moves h3 { font-size: 19px; font-weight: 500; letter-spacing: -0.01em; }
.moves p { margin-top: 4px; color: var(--dark-ink-2); }
.act-meta { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; margin-top: 10px; font-size: 13px; color: var(--dark-ink-2); }
.act-usd { font-family: var(--mono); color: var(--dark-accent); }
.act-owner { display: inline-flex; gap: 8px; align-items: center; }
.owner-in { background: transparent; border: 0; border-bottom: 1px dashed var(--dark-ink-2); color: var(--dark-ink); padding: 2px 0; width: 14ch; }
.decide { margin-top: 10px; padding-top: 16px; border-top: 1px solid var(--dark-line); }
.decide p { margin-top: 6px; font-size: 19px; color: var(--dark-ink); }
.row { display: grid; grid-template-columns: repeat(12, 1fr); gap: 28px; padding: 40px 0; border-bottom: 1px solid var(--line); }
.rail { grid-column: span 4; }
.rail-in { position: sticky; top: 20px; }
.rail h2 { margin-top: 10px; font-size: 26px; line-height: 1.15; letter-spacing: -0.02em; font-weight: 500; }
.rail .note { margin-top: 12px; color: var(--ink-2); max-width: 40ch; }
.proof { grid-column: span 8; display: grid; gap: 18px; min-width: 0; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); }
.tile { background: var(--raised); padding: 16px 18px 18px; }
.tile-fig { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
.tile-num { font-size: 40px; line-height: 1; letter-spacing: -0.03em; font-weight: 500; font-variant-numeric: tabular-nums; }
.tile-unit, .tile-note { margin-top: 6px; color: var(--ink-2); font-size: 14px; }
.items li { display: grid; grid-template-columns: auto 1fr; gap: 12px; padding: 14px 0; border-top: 1px solid var(--line); }
.items h3, .tl h3 { font-size: 17px; font-weight: 500; }
.items p, .tl p { color: var(--ink-2); margin-top: 2px; }
.tl li { display: grid; grid-template-columns: 120px 1fr auto; gap: 14px; padding: 14px 0; border-top: 1px solid var(--line); }
.tl-date { font: 400 13px/1.6 var(--mono); color: var(--accent); }
.tbl-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.tbl-search { height: 36px; padding: 0 10px; border: 1px solid var(--line-2); background: var(--raised); min-width: 220px; }
select { height: 36px; border: 1px solid var(--line-2); background: var(--raised); padding: 0 8px; }
.tbl-count { font-size: 13px; color: var(--ink-2); }
.tbl-wrap { overflow-x: auto; border-top: 2px solid var(--ink); }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { text-align: left; font: 400 11px/1.4 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--ink-2); padding: 10px 10px; border-bottom: 1px solid var(--line-2); white-space: nowrap; }
th button { all: unset; cursor: pointer; }
th[aria-sort="ascending"] button::after { content: " \2191"; }
th[aria-sort="descending"] button::after { content: " \2193"; }
td { padding: 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
tr.is-off td:first-child { box-shadow: inset 3px 0 0 var(--bad); }
tr.is-hold td:first-child { box-shadow: inset 3px 0 0 var(--hold); }
tr.is-on td:first-child { box-shadow: inset 3px 0 0 var(--good); }
.more { justify-self: start; }
.draft { border: 1px solid var(--line-2); background: var(--raised); }
.draft-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.draft-meta { font-size: 13px; color: var(--ink-2); }
.draft-meta b { color: var(--ink); font-weight: 500; }
.draft-body { padding: 14px; white-space: pre-wrap; font-size: 15px; }
.draft-flag { padding: 8px 14px; font-size: 13px; background: var(--hold-wash); color: var(--hold-ink); }
.check li { display: grid; grid-template-columns: 24px 1fr; gap: 10px; padding: 12px 0; border-top: 1px solid var(--line); }
.check input { width: 18px; height: 18px; margin-top: 3px; accent-color: var(--accent); }
.check .src { display: block; color: var(--ink-2); font-size: 13px; }
.check li.done span { text-decoration: line-through; color: var(--ink-2); }
.prose p + p { margin-top: 10px; }
.math-toggle svg, .chip svg { width: 12px; height: 12px; flex: none; }
.math-toggle { all: unset; cursor: pointer; display: inline-flex; gap: 8px; align-items: center; font: 400 12px/1.4 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
.math-body { margin-top: 10px; padding: 14px 16px; background: var(--raised); border-left: 2px solid var(--accent); font: 400 13px/1.6 var(--mono); }
.math-body li + li { margin-top: 4px; }
.end { padding-top: 32px; color: var(--ink-2); font-size: 14px; }
.end p + p { margin-top: 6px; }
.brand { font: 500 12px/1.4 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink); }
.toc { display: flex; flex-wrap: wrap; gap: 6px 18px; padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
.toc a { color: var(--ink-2); text-decoration: none; border-bottom: 1px solid var(--line-2); }
.toc a:hover { color: var(--ink); }
@media (max-width: 979px) { .found, .moves { grid-column: span 12; } .rail, .proof { grid-column: span 12; } .rail-in { position: static; } }
@media (max-width: 639px) { .page { padding: 0 16px 40px; } .tl li { grid-template-columns: 1fr; gap: 4px; } .moves { padding: 22px 18px 10px; } }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
@media print {
  @page { size: letter; margin: .55in; }
  :root { --surface: #ffffff; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { zoom: .78; }
  .page { max-width: none; padding: 0; }
  .btn, .math-toggle, .tbl-tools, .note-line, .more, .toc { display: none !important; }
  .math-body[hidden], tr[hidden] { display: revert !important; }
  .rail-in { position: static; }
  .row, .items li, .tl li, .draft, .check li, .tile, tr { break-inside: avoid; }
  .owner-in { border-bottom-color: transparent; }
}
</style>
</head>
<body>
<main class="page" id="page"></main>
<noscript><p style="padding:24px">This page needs JavaScript turned on to draw its sections.</p></noscript>

<!-- The only part that changes from run to run. build_page.py fills it in. -->
<script type="application/json" id="page-data">/*PAGE_DATA*/</script>

<script>
(function () {
  'use strict';
  var D = JSON.parse(document.getElementById('page-data').textContent);
  var root = document.getElementById('page');
  var SVG = 'http://www.w3.org/2000/svg';
  var KEY = 'ai-page:' + (D.id || D.report || 'page') + ':';

  /* Text always goes in as text, never as markup. */
  function h(spec, attrs) {
    var bits = spec.split('.');
    var node = document.createElement(bits[0] || 'div');
    if (bits.length > 1) node.className = bits.slice(1).join(' ');
    var start = 1;
    if (attrs && typeof attrs === 'object' && !attrs.nodeType && !Array.isArray(attrs)) {
      Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) node.setAttribute(k, attrs[k]); });
      start = 2;
    }
    for (var i = start; i < arguments.length; i++) put(node, arguments[i]);
    return node;
  }
  function put(node, kid) {
    if (kid == null || kid === false || kid === '') return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { put(node, k); }); return; }
    node.appendChild(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  function store(k, v) { try { if (v == null) localStorage.removeItem(KEY + k); else localStorage.setItem(KEY + k, v); } catch (e) { /* storage off: kept for this visit only */ } }
  function recall(k) { try { return localStorage.getItem(KEY + k); } catch (e) { return null; } }

  var PATHS = { on: 'M2.6 6.4 5 8.8 9.4 3.6', off: 'M3.2 3.2 8.8 8.8M8.8 3.2 3.2 8.8', hold: 'M2.5 6h7', quiet: 'M6 3v0M6 6v3', plus: 'M6 2v8M2 6h8', minus: 'M2 6h8' };
  var WORD = { on: 'On', off: 'Off', hold: 'Watch', quiet: 'No Data' };
  function icon(name) {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 12 12'); s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', PATHS[name] || PATHS.quiet); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '1.6'); p.setAttribute('stroke-linecap', 'round');
    s.appendChild(p); return s;
  }
  function chip(status, text) {
    if (!status) return null;
    return h('span.chip.' + status, icon(status), h('span', text || WORD[status] || status));
  }
  function mark() {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 18 18'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'mark');
    [['circle', { cx: 9, cy: 9, r: 7.25, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 }], ['circle', { cx: 9, cy: 9, r: 3, fill: 'currentColor' }]].forEach(function (c) {
      var e = document.createElementNS(SVG, c[0]); Object.keys(c[1]).forEach(function (k) { e.setAttribute(k, c[1][k]); }); s.appendChild(e);
    });
    return s;
  }
  function lockup(spec) {
    var text = D.lockup || 'Brought to you by Amplified Impact';
    return h(spec, { role: 'group', 'aria-label': text },
      h('span.lockup-by', text.replace(/\s*Amplified Impact\s*$/, '')),
      h('span.wordmark', mark(), h('span', 'Amplified Impact')));
  }
  var mathCount = 0;
  function math(lines, title) {
    if (!lines || !lines.length) return null;
    var id = 'math-' + (++mathCount);
    var body = h('div.math-body', { id: id, hidden: 'hidden' }, title ? h('p', title) : null, h('ul', lines.map(function (l) { return h('li', l); })));
    var btn = h('button.math-toggle', { type: 'button', 'aria-expanded': 'false', 'aria-controls': id }, icon('plus'), h('span', 'Show The Math'));
    btn.addEventListener('click', function () {
      var opening = body.hasAttribute('hidden');
      if (opening) body.removeAttribute('hidden'); else body.setAttribute('hidden', 'hidden');
      btn.setAttribute('aria-expanded', String(opening));
      clear(btn); put(btn, [icon(opening ? 'minus' : 'plus'), h('span', opening ? 'Hide The Math' : 'Show The Math')]);
    });
    return h('div', btn, body);
  }
  function copyText(text, btn, label) {
    function done() { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = label; }, 1800); }
    function failed() { btn.textContent = 'Select And Copy By Hand'; setTimeout(function () { btn.textContent = label; }, 3000); }
    try { navigator.clipboard.writeText(text).then(done, failed); } catch (e) { failed(); }
  }

  /* ----- top: lockup, data check, title, buttons, meta strip ----- */
  var owners = [];
  function summaryText() {
    var out = [D.report + (D.meta ? ': ' + D.meta.map(function (m) { return m.value; }).join(', ') : '')];
    if (D.sample) out.push(D.sample);
    if (D.dataCheck && D.dataCheck.length) { out.push('', 'Data Check'); D.dataCheck.forEach(function (t) { out.push('- ' + t); }); }
    out.push('', 'Bottom Line: ' + (D.headline || []).join(' '));
    if (D.findings && D.findings.length) { out.push('', 'What We Found'); D.findings.forEach(function (f) { out.push('- ' + (f.chip || WORD[f.status] || '') + ': ' + f.text); }); }
    if (D.moves && D.moves.length) {
      out.push('', D.movesLabel || 'First Moves');
      D.moves.forEach(function (m, i) {
        var o = owners[i] && owners[i].value ? ' Owner: ' + owners[i].value + '.' : '';
        out.push((i + 1) + '. ' + m.title + (m.size ? ' (' + m.size + ')' : '') + ' ' + (m.text || '') + o);
      });
    }
    if (D.decide) out.push('', 'Decide: ' + D.decide);
    return out.join('\n');
  }
  function top() {
    var copy = h('button.btn', { type: 'button' }, 'Copy Summary');
    copy.addEventListener('click', function () { copyText(summaryText(), copy, 'Copy Summary'); });
    var print = h('button.btn', { type: 'button' }, 'Print Or Save As PDF');
    print.addEventListener('click', function () { window.print(); });
    return [
      lockup('div.lockup'),
      D.dataCheck && D.dataCheck.length ? h('section.data-check', { role: 'alert', 'aria-label': 'Data Check' },
        h('p.data-check-label', icon('off'), h('span', 'Data Check')), h('ul', D.dataCheck.map(function (t) { return h('li', t); }))) : null,
      h('header.top', h('div', h('p.eyebrow', D.report), D.subtitle ? h('p', { style: 'margin-top:6px;color:var(--ink-2)' }, D.subtitle) : null),
        h('div.top-act', D.sample ? h('span.sample', D.sample) : null, copy, print)),
      D.meta && D.meta.length ? h('dl.strip', D.meta.map(function (m) { return h('div', h('dt.label', m.label), h('dd', m.value)); })) : null
    ];
  }
  function toc() {
    var list = (D.sections || []).filter(function (s) { return s.label; });
    if (list.length < 4) return null;
    return h('nav.toc', { 'aria-label': 'Sections' }, list.map(function (s, i) { return h('a', { href: '#s-' + (s.id || i) }, s.label); }));
  }
  /* ----- the bottom line: headline, what we found, first moves with editable owners, decide ----- */
  function bottom() {
    var hasMoves = D.moves && D.moves.length;
    return h('section.bottom', { 'aria-label': 'Bottom Line' },
      h('p.eyebrow', 'Bottom Line'),
      h('h1.headline', (D.headline || []).map(function (l) { return h('span', l + ' '); })),
      (D.findings && D.findings.length) || hasMoves ? h('div.summary',
        D.findings && D.findings.length ? h('div.found' + (hasMoves ? '' : '.wide'),
          h('h2.label', 'What We Found'),
          h('ul', D.findings.map(function (f) { return h('li', chip(f.status, f.chip), h('span', f.text)); }))) : null,
        hasMoves ? h('div.moves',
          h('h2.label', D.movesLabel || 'First Moves'),
          h('ol', D.moves.map(function (m, i) {
            var id = 'owner-' + i;
            var input = h('input.owner-in', { id: id, type: 'text', value: m.owner || '', placeholder: 'Add an owner', autocomplete: 'off' });
            var saved = recall('owner-' + i); if (saved != null) input.value = saved;
            input.addEventListener('input', function () { store('owner-' + i, input.value); });
            owners[i] = input;
            return h('li', h('span.idx', { 'aria-hidden': 'true' }, (i < 9 ? '0' : '') + (i + 1)), h('div',
              h('h3', m.title), m.text ? h('p', m.text) : null,
              h('div.act-meta', m.tag ? h('span', m.tag) : null, m.size ? h('span.act-usd', m.size) : null,
                h('label.act-owner', { 'for': id }, h('span', 'Owner'), input))));
          })),
          D.decide ? h('div.decide', h('span.label', 'Decide'), h('p', D.decide)) : null) : null) : null);
  }
  /* ----- section kinds. Add a kind here once and every skill can use it. ----- */
  function fmt(v, type) {
    if (v == null || v === '') return '';
    if (typeof v !== 'number') return String(v);
    if (type === 'usd') return (v < 0 ? '\u2212$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
    if (type === 'pct') return (v < 0 ? '\u2212' : '') + Math.abs(Math.round(v * 10) / 10).toFixed(1) + '%';
    if (type === 'num') return v.toLocaleString('en-US');
    return String(v);
  }
  function tableView(s) {
    var cols = s.columns || [], rows = (s.rows || []).slice();
    var st = { q: '', f: {}, key: s.sort ? s.sort.key : null, dir: s.sort && s.sort.dir === 'asc' ? 1 : -1, all: false };
    var limit = s.limit || 25;
    var tbody = h('tbody'), count = h('span.tbl-count', { role: 'status' }), more = h('button.btn.more', { type: 'button' }, 'Show All Rows');
    var heads = cols.map(function (c) {
      var th = h('th' + (c.type === 'usd' || c.type === 'num' || c.type === 'pct' ? '.num' : ''), { scope: 'col' });
      var b = h('button', { type: 'button' }, c.label);
      b.addEventListener('click', function () { if (st.key === c.key) st.dir = -st.dir; else { st.key = c.key; st.dir = (c.type === 'text' || !c.type) ? 1 : -1; } draw(); });
      th.appendChild(b); return th;
    });
    var tools = [];
    if (s.search !== false && rows.length > 8) {
      var q = h('input.tbl-search', { type: 'search', placeholder: 'Search this table', 'aria-label': 'Search ' + (s.label || 'table') });
      q.addEventListener('input', function () { st.q = q.value.toLowerCase(); draw(); });
      tools.push(q);
    }
    (s.filters || []).forEach(function (fk) {
      var col = cols.filter(function (c) { return c.key === fk; })[0]; if (!col) return;
      var vals = []; rows.forEach(function (r) { var v = r[fk]; if (v != null && vals.indexOf(String(v)) < 0) vals.push(String(v)); });
      vals.sort();
      var sel = h('select', { 'aria-label': 'Filter by ' + col.label }, h('option', { value: '' }, 'All ' + col.label), vals.map(function (v) { return h('option', { value: v }, v); }));
      sel.addEventListener('change', function () { st.f[fk] = sel.value; draw(); });
      tools.push(sel);
    });
    more.addEventListener('click', function () { st.all = true; draw(); });
    function draw() {
      var shown = rows.filter(function (r) {
        if (st.q && cols.map(function (c) { return String(r[c.key] == null ? '' : r[c.key]); }).join(' ').toLowerCase().indexOf(st.q) < 0) return false;
        return Object.keys(st.f).every(function (k) { return !st.f[k] || String(r[k]) === st.f[k]; });
      });
      if (st.key) shown.sort(function (a, b) {
        var col = cols.filter(function (c) { return c.key === st.key; })[0] || {};
        var sk = col.sortKey || st.key;
        var x = a[sk], y = b[sk];
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * st.dir;
        return String(x == null ? '' : x).localeCompare(String(y == null ? '' : y)) * st.dir;
      });
      heads.forEach(function (th, i) { th.setAttribute('aria-sort', cols[i].key === st.key ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'); });
      clear(tbody);
      shown.forEach(function (r, i) {
        var tr = h('tr' + (r._status ? '.is-' + r._status : ''), cols.map(function (c) {
          var v = r[c.key];
          if (c.type === 'status') return h('td', chip(v, r._chip));
          return h('td' + (c.type === 'usd' || c.type === 'num' || c.type === 'pct' ? '.num' : ''), fmt(v, c.type));
        }));
        if (!st.all && i >= limit) tr.setAttribute('hidden', 'hidden');
        tbody.appendChild(tr);
      });
      count.textContent = shown.length === rows.length ? rows.length + ' rows' : shown.length + ' of ' + rows.length + ' rows';
      more.style.display = !st.all && shown.length > limit ? '' : 'none';
    }
    draw();
    return [tools.length ? h('div.tbl-tools', tools, count) : null,
      h('div.tbl-wrap', h('table', s.caption ? h('caption.label', { style: 'text-align:left;padding:8px 0' }, s.caption) : null, h('thead', h('tr', heads)), tbody)), more];
  }
  function tilesView(s) {
    return h('div.tiles', (s.tiles || []).map(function (t) {
      return h('div.tile', h('p.label', t.label), h('div.tile-fig', h('span.tile-num', t.value), chip(t.status, t.chip)),
        t.unit ? h('p.tile-unit', t.unit) : null, t.note ? h('p.tile-note', t.note) : null);
    }));
  }
  function listView(s) {
    return h('ul.items', (s.items || []).map(function (it) {
      return h('li', it.status ? chip(it.status, it.chip) : h('span'), h('div', it.title ? h('h3', it.title) : null, it.text ? h('p', it.text) : null, math(it.math)));
    }));
  }
  function timelineView(s) {
    return h('ol.tl', (s.items || []).map(function (it) {
      return h('li', h('span.tl-date', it.date || ''), h('div', h('h3', it.title), it.text ? h('p', it.text) : null), chip(it.status, it.chip));
    }));
  }
  function draftsView(s) {
    return (s.drafts || []).map(function (d) {
      var btn = h('button.btn', { type: 'button' }, 'Copy Draft');
      var text = (d.subject ? 'Subject: ' + d.subject + '\n\n' : '') + (d.body || '');
      btn.addEventListener('click', function () { copyText(text, btn, 'Copy Draft'); });
      return h('article.draft',
        h('div.draft-head', h('div.draft-meta', h('b', d.label || 'Draft'), d.to ? ' \u00b7 To: ' + d.to : '', d.channel ? ' \u00b7 ' + d.channel : ''), btn),
        d.subject ? h('div.draft-meta', { style: 'padding:10px 14px 0' }, h('b', 'Subject: '), d.subject) : null,
        h('div.draft-body', d.body || ''),
        d.flag ? h('p.draft-flag', d.flag) : null);
    });
  }
  function checklistView(s) {
    return h('ul.check', (s.items || []).map(function (it, i) {
      var id = (s.id || 'check') + '-' + i;
      var box = h('input', { type: 'checkbox', id: id });
      var li = h('li', box, h('label', { 'for': id }, h('span', it.text), it.source ? h('span.src', 'Check against: ' + it.source) : null));
      if (recall(id) === '1') { box.checked = true; li.classList.add('done'); }
      box.addEventListener('change', function () { store(id, box.checked ? '1' : null); li.classList.toggle('done', box.checked); });
      return li;
    }));
  }
  function proseView(s) { return h('div.prose', (s.paragraphs || []).map(function (p) { return h('p', p); })); }
  var KINDS = { table: tableView, tiles: tilesView, list: listView, timeline: timelineView, drafts: draftsView, checklist: checklistView, prose: proseView };
  function section(s, i) {
    var view = KINDS[s.kind]; if (!view) return null;
    return h('section.row', { id: 's-' + (s.id || i), 'aria-label': s.label },
      h('div.rail', h('div.rail-in', h('p.eyebrow', s.label), s.finding ? h('h2', s.finding) : null, s.note ? h('p.note', s.note) : null, s.flag ? chip(s.flag.status, s.flag.text) : null)),
      h('div.proof', view(s), math(s.math, s.mathTitle)));
  }
  function end() {
    return [h('div.end', h('p.brand', D.stamp || D.report), D.closing ? h('p', D.closing) : null, D.sample ? h('p', D.sample) : null,
      h('p', 'Nothing you do on this page changes your numbers or sends anything. Names you type and boxes you tick stay in this browser only.')),
      lockup('div.lockup.lockup-end')];
  }
  put(root, [top(), toc(), bottom(), (D.sections || []).map(section), end()]);
})();
</script>
</body>
</html>
```

## Appendix E: references/page-format.md

````markdown
# Page Format (Read Only When Building The Page)

You write two small JSON files. `scripts/build_page.py` turns them into the page. Never open or edit
`assets/base-template.html`.

## page.json

- `id`: skill, subject and period, for example `"agent-1on1-prep:marigold:2026-11-12"`. Keeps typed owners and ticked boxes apart between pages.
- `report`: the skill name in Title Case. `subtitle`: one line, who and when (times end in MT).
- `sample`: `"Practice File: Made-Up Example"` on any practice or made-up run. Leave it out on real runs.
- `meta`: 2 to 5 `{label, value}` pairs (Title Case labels): who, period, as-of date, source.
- `dataCheck`: list of warnings the analysis raised. They print in red at the top. Never drop one to make the page look clean.
- `headline`, `findings`, `moves`, `decide`: put these in `words.json` instead (below).
- `sections`: one per item of "Output, In This Order", in that order. Each: `id`, `kind`, `label` (Title Case), `finding` (one sentence), optional `note`, optional `math` (list of plain lines showing the arithmetic).

| kind | fields |
|---|---|
| `tiles` | `tiles`: `{label, value, unit, status, note}`. Big numbers. `value` is already formatted ("$98,450"). |
| `table` | `columns`: `{key, label, type}` with type `text`, `num`, `usd`, `pct` or `status`; `rows`: objects (numbers as numbers), optional `_status` per row; optional `filters` (column keys), `sort` `{key, dir}`, `limit` (rows before Show All). |
| `list` | `items`: `{status, title, text, math}`. Flags, findings, questions. |
| `timeline` | `items`: `{date, title, text, status}`. Dated plans and deadlines. |
| `drafts` | `drafts`: `{label, to, channel, subject, body, flag}`. Every outgoing message. Subjects in Title Case. `channel` says where it goes ("Gmail draft", "FUB note"). |
| `checklist` | `items`: `{text, source}`. Check Before Sending: every date, dollar amount, name and quoted fact in the drafts, with the file to check it against. Always the last section. |
| `prose` | `paragraphs`: short plain paragraphs. Use rarely. |

Statuses: `on` (good), `off` (problem), `hold` (Watch), `quiet` (No Data).

## words.json

```json
{
  "headline": ["Two short sentences.", "About six words each."],
  "findings": [{"status": "off", "text": "One sentence with the number."}],
  "moves": [{"title": "Imperative Title Case", "text": "How, with the number.", "tag": "What it fixes", "owner": ""}],
  "sections": {"<section id>": {"finding": "...", "note": "..."}}
}
```

Three findings, most important first. Up to three moves. `owner` only when a person was named.

## Rules the build enforces

Every number must be in `facts.json` or the user's files. No em or en dashes. Title Case headings. Every
clock time followed by MT. Never "industry standard". No sentence saying anything was sent, posted or
changed: you read and draft only. A page with drafts must end with a Check Before Sending checklist.
````

## Appendix F: Sample (made-up)

facts.json
```json
{
  "agent": "Marigold Fizzwhistle",
  "as_of": "2026-11-10",
  "goal_closings_ytd": 18,
  "closings_ytd": 11,
  "pace_pct": 72.4,
  "appointments_met_oct": 6,
  "appointments_met_sep": 9,
  "signed_oct": 2,
  "gci_ytd": 98450,
  "gci_goal_ytd": 140000,
  "gci_gap": 41550,
  "commitments": [{"text": "Call 20 past clients", "done": false}, {"text": "Hold 2 open houses", "done": true}]
}
```
page.json
```json
{
 "id": "sample-1on1-marigold-2026-11",
 "report": "Agent 1:1 Prep",
 "subtitle": "Marigold Fizzwhistle, one-on-one on Thursday, November 12 at 10:00 AM MT",
 "sample": "Practice File: Made-Up Example",
 "meta": [
  {
   "label": "Agent",
   "value": "Marigold Fizzwhistle"
  },
  {
   "label": "Numbers As Of",
   "value": "Nov 10, 2026 (Sisu)"
  },
  {
   "label": "Meeting",
   "value": "Thu, Nov 12, 10:00 AM MT"
  },
  {
   "label": "For",
   "value": "The Team Leader Only"
  }
 ],
 "headline": [
  "Closings are behind pace.",
  "Appointments fell in October."
 ],
 "findings": [
  {
   "status": "off",
   "text": "11 closings against a year-to-date goal of 18, a pace of 72.4%."
  },
  {
   "status": "hold",
   "text": "Appointments met fell from 9 in September to 6 in October."
  },
  {
   "status": "on",
   "text": "One of two commitments from last time is done."
  }
 ],
 "moves": [
  {
   "title": "Ask About The October Drop",
   "text": "Start with appointments met before closings.",
   "tag": "Appointments"
  },
  {
   "title": "Agree On One Weekly Number",
   "text": "Pick one activity she owns through December.",
   "tag": "Pace"
  }
 ],
 "sections": [
  {
   "id": "numbers",
   "kind": "tiles",
   "label": "Numbers Against Goal",
   "finding": "Behind on closings and GCI.",
   "tiles": [
    {
     "label": "Closings YTD",
     "value": "11",
     "unit": "of 18 goal",
     "status": "off"
    },
    {
     "label": "Pace",
     "value": "72.4%",
     "unit": "of goal to date",
     "status": "off"
    },
    {
     "label": "GCI YTD",
     "value": "$98,450",
     "unit": "of $140,000 goal",
     "status": "off"
    },
    {
     "label": "Signed In October",
     "value": "2",
     "unit": "buyer or listing agreements",
     "status": "quiet"
    }
   ],
   "math": [
    "Pace: 11 / 18 = 0.611, prorated goal to Nov 10 is 15.2, so 11 / 15.2 = 72.4%",
    "GCI gap: $140,000 - $98,450 = $41,550"
   ]
  },
  {
   "id": "months",
   "kind": "table",
   "label": "Month By Month",
   "finding": "October was the lowest month for appointments.",
   "columns": [
    {
     "key": "month",
     "label": "Month",
     "type": "text",
     "sortKey": "ym"
    },
    {
     "key": "met",
     "label": "Appts Met",
     "type": "num"
    },
    {
     "key": "signed",
     "label": "Signed",
     "type": "num"
    },
    {
     "key": "closed",
     "label": "Closed",
     "type": "num"
    }
   ],
   "rows": [
    {
     "month": "Aug 2026",
     "met": 8,
     "signed": 3,
     "closed": 1,
     "ym": "2026-08"
    },
    {
     "month": "Sep 2026",
     "met": 9,
     "signed": 2,
     "closed": 2,
     "ym": "2026-09"
    },
    {
     "month": "Oct 2026",
     "met": 6,
     "signed": 2,
     "closed": 1,
     "_status": "hold",
     "ym": "2026-10"
    }
   ],
   "sort": {
    "key": "month",
    "dir": "asc"
   }
  },
  {
   "id": "commitments",
   "kind": "list",
   "label": "Last Time's Commitments",
   "finding": "One of two is done.",
   "items": [
    {
     "status": "off",
     "title": "Call 20 Past Clients",
     "text": "Not done. Ask what got in the way."
    },
    {
     "status": "on",
     "title": "Hold 2 Open Houses",
     "text": "Done."
    }
   ]
  },
  {
   "id": "recap",
   "kind": "drafts",
   "label": "Recap Template",
   "finding": "Fill it in after the meeting.",
   "drafts": [
    {
     "label": "Recap Email",
     "to": "[Agent Email]",
     "channel": "Gmail draft",
     "subject": "Our One-On-One Recap",
     "body": "Hi Marigold,\n\nThanks for today. Here is what we agreed:\n- [Commitment 1]\n- [Commitment 2]\n\nWe check in again on [Date] at [Time] MT.\n\n[Leader Name]"
    }
   ]
  },
  {
   "id": "check",
   "kind": "checklist",
   "label": "Check Before Sending",
   "finding": "Every fact in the recap, traced.",
   "items": [
    {
     "text": "Meeting date Thursday, November 12",
     "source": "Calendar invite"
    },
    {
     "text": "Closings 11 and goal 18",
     "source": "Sisu export, Nov 10, 2026"
    },
    {
     "text": "Every [placeholder] filled in",
     "source": "The recap draft"
    }
   ]
  }
 ],
 "stamp": "Agent 1:1 Prep",
 "closing": "Built from the agent's own numbers and goals. For the leader, not the agent's file."
}
```
words.json
```json
{
  "headline": ["Closings are behind pace.", "October appointments slipped."],
  "findings": [
    {"status": "off", "text": "Marigold has 11 closings against 18 for the year to date, a pace of 72.4%."},
    {"status": "hold", "text": "Appointments met dropped from 9 to 6 in October, so the pipeline is thinning \u2014 ask why first."},
    {"status": "on", "text": "She held both open houses she committed to."}
  ],
  "sections": {"numbers": {"note": "GCI is $41,550 short of goal to date."}}
}
```

## Appendix G: tests/run_tests.py

```python
#!/usr/bin/env python3
"""Self-test for the shared page kit. Run: python tests/run_tests.py  (all must pass)."""
import json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
BUILD = os.path.join(KIT, "scripts", "build_page.py")
SAMPLE = os.path.join(KIT, "sample")
results = []


def run(page, words=None, extra=(), out=True):
    tmp = tempfile.mkdtemp()
    pp = os.path.join(tmp, "page.json"); json.dump(page, open(pp, "w"))
    cmd = [sys.executable, BUILD, pp, "--facts", os.path.join(SAMPLE, "facts.json")]
    if words is not None:
        wp = os.path.join(tmp, "words.json"); json.dump(words, open(wp, "w")); cmd += ["--words", wp]
    o = os.path.join(tmp, "out.html")
    if out:
        cmd += ["--out", o]
    cmd += list(extra)
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr, o


def case(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + ("" if ok else "\n     " + detail[:400]))


base = json.load(open(os.path.join(SAMPLE, "page.json")))
words = json.load(open(os.path.join(SAMPLE, "words.json")))

code, log, out = run(base, words)
html = open(out).read() if code == 0 else ""
case("sample builds", code == 0, log)
case("one self-contained file: no external fetches", code == 0 and not re.search(r'(src|href)=["\']https?://', html) and "@import" not in html, log)
case("fonts embedded", "font/woff2;base64" in html)
case("em dash replaced with a note", "Dashes replaced" in log and "\u2014" not in html.split('id="page-data">')[1])

w = dict(words); w["findings"] = [{"status": "off", "text": "Closings are 14 short, worth $61,000 a year."}]
code, log, _ = run(base, w); case("stray number stops the build", code == 1 and "61000" in log, log)

w = dict(words); w["headline"] = ["Pace is below the industry standard."]
code, log, _ = run(base, w); case('"industry standard" stops the build', code == 1 and "industry standard" in log, log)

p = json.loads(json.dumps(base)); p["subtitle"] = "One-on-one Thursday at 10:00 AM"
code, log, _ = run(p, words); case("a time without MT stops the build", code == 1 and "needs \"MT\"" in log, log)

p = json.loads(json.dumps(base)); p["sections"][0]["label"] = "Numbers against goal"
code, log, _ = run(p, words); case("a heading not in Title Case stops the build", code == 1 and "Title Case" in log, log)

p = json.loads(json.dumps(base)); p["closing"] = "I sent the recap to Marigold."
code, log, _ = run(p, words); case("a claim that something was sent stops the build", code == 1 and "draft only" in log, log)

p = json.loads(json.dumps(base)); p["sections"] = [s for s in p["sections"] if s["kind"] != "checklist"]
code, log, _ = run(p, words); case("drafts without Check Before Sending stop the build", code == 1 and "checklist" in log, log)

p = json.loads(json.dumps(base)); p["sections"][0]["kind"] = "chart3d"
code, log, _ = run(p, words); case("unknown section kind stops the build", code == 1 and "kind" in log, log)

code, log, out = run(base, words, ["--fonts", "/nonexistent.css"])
case("lite build without fonts still works", code == 0 and "system fonts" in log and "base64" not in open(out).read(), log)

code, log, _ = run(base, words, ["--check-only"], out=False)
case("check-only writes nothing", code == 0 and "Nothing written" in log, log)

p = json.loads(json.dumps(base)); p["closing"] = "</script><script>alert(1)</script>"
code, log, out = run(p, words)
case("data cannot break out of the JSON block", code == 0 and "</script><script>alert" not in open(out).read(), log)

passed = sum(1 for _, ok in results if ok)
print("\n%d of %d passed" % (passed, len(results)))
sys.exit(0 if passed == len(results) else 1)
```

## Appendix H: SKILL.md Paste-In Blocks

# Paste-In Text For A Converted SKILL.md

Two blocks. Edit the words in [brackets]. Keep each SKILL.md under about 150 lines.

## Block 1, near the top

~~~markdown
## Before You Start: Code
This skill hands back a page: one HTML file the [owner] can sort, search and print. The page is built by
`scripts/build_page.py`, so it needs code execution (Claude: Settings > Capabilities > Code execution and
file creation. ChatGPT: the code tool). Check once with `python scripts/build_page.py --help`
(`python3` if `python` is not found).
[NUMBERS SKILL:] If code can't run, stop and say how to turn it on. Never estimate or hand-write the page.
[DRAFTING SKILL:] If code can't run, give the same sections as plain text in the same order, and one line:
"Turn on code execution to get this as a page you can sort and print."
~~~

## Block 2, as the last numbered step (replaces the old chat-only output)

~~~markdown
## [N]. Hand It Back As A Page
1. Write `facts.json` from the analysis code: every number the output uses. Never type a number by hand.
2. Write `page.json` in your work folder: the sections in "Output, In This Order", using the section kinds in
   `references/page-format.md`. Drafts go in one `drafts` section. Check Before Sending is the last section, a
   `checklist`.
3. Write `words.json`: the headline (two short sentences), three findings, up to three moves.
4. Build: `python scripts/build_page.py page.json --words words.json --facts facts.json --inputs <their files> --out <work folder>/<Skill-Name>-<Subject>-<YYYY-MM>.html`
5. BUILD STOPPED lists what to fix (a number not in the facts, a time without MT, a heading not in Title Case,
   "industry standard", a line saying something was sent). Fix the words, never the check, and build again.
6. Hand over the file the way this assistant hands files to a user, at the path the build printed (Claude: the
   outputs folder, so it shows as a download. ChatGPT: the download link, and say "download it now, the link
   expires"). Then four lines in the chat: the headline, the number that matters, the first move, and "check
   every number against your files before you act."
~~~
