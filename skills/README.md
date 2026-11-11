# Skills: the source of every free skill in the library

Each folder here is one skill in the free library (`/library`). Its page is `/<page slug>`, built from
`apps/web/src/guides/<page slug>.ts`. `node scripts/skills.mjs build` turns each folder into the files
the page offers, under `apps/web/public/downloads/`, and a test fails when a committed file and its
source drift apart. Never edit a file in `downloads/` by hand: edit the source here and rebuild.

```
skills/
  _shared/                 canonical references, copied into each skill that lists them (skill.json "shared")
  <name>/
    skill.json             the build manifest (below)
    SKILL.md               what Claude reads
    references/            what Claude reads only when SKILL.md says to
    scripts/ ...           any other file Claude needs (only skills that already had them)
    chatgpt/               the ChatGPT Project version (skills that work in ChatGPT)
      instructions.md      the full instructions, uploaded as a project file
      paste.txt            the short text pasted into the Project's Instructions box
      *.md                 up to 3 more files to upload
    grok/                  a Grok Bot template of the same skill (only Morning Brief so far, D-108)
      SKILL.md             in the Grok Bot templates' shape (D-100), saved in Grok Bot as a skill
    practice/              the made-up practice files, offered on the page
    evals/
      evals.json           the test cases
      files/               their input files (made-up)
      runs/<case>/         what each run returned, and grading.md
    sample.md              one kept sample output, from a run on the practice files (for the page)
    page-notes.md          everything the page needs that is not in SKILL.md (below)
```

## What ships where

| Download | Built from | Name |
|---|---|---|
| The Claude skill | `SKILL.md`, `references/`, every other file at the root except the ones below, plus `_shared/` files listed in `skill.json` (into `references/`) | `<name>.zip`, one folder `<name>/` at its root |
| The ChatGPT Project version | `chatgpt/` | `<name>-chatgpt.zip`, one folder `<name>-chatgpt/` |
| The practice files | `practice/` | `<name>-practice.zip`, one folder `<name>-practice/` |
| The Grok Bot template (D-108) | `grok/SKILL.md` | `<name>-grok.zip`, one folder `<name>-grok/` |

Never shipped in the Claude skill: `skill.json`, `chatgpt/`, `grok/`, `practice/`, `evals/`, `sample.md`, `page-notes.md`.

## skill.json

```json
{
  "name": "due-diligence-review",
  "page": "due-diligence-review",
  "title": "Due Diligence Review",
  "version": "1.1",
  "apps": ["claude", "chatgpt"],
  "shared": ["utah-repc.md"]
}
```

`name` is the folder and the skill's `name`. `page` is the page slug, which is also the sign-up source
and the GoHighLevel tag; it equals `name` except where a skill already had another name
(`content-opportunity-research` is the Content Strategist, at `/content-strategist`). `apps` lists
`chatgpt` only when `chatgpt/` exists, and `grok` only when `grok/` exists.

## grok/ (D-108)

A skill whose brief asks for a Grok Bot template ships one beside the Claude skill: `grok/SKILL.md`,
nothing else in the folder, in the shape the Grok Bot shelf's templates have (its sections in order,
a routine with a schedule, an example cron and a prompt to save, and no dashes; `node scripts/skills.mjs
check` holds it to that with the same check as `scripts/grok-templates.mjs`). Its page puts Grok Bot
first in the app switch, with the shelf's seven steps (`grokSetup`). The skill stays one catalog row
with a `grok` file; it is not on the Grok Bot shelf, whose templates have no Claude version.

## SKILL.md rules (checked by `node scripts/skills.mjs check`)

- Frontmatter keys only from: `name`, `description`, `license`, `allowed-tools`, `metadata`,
  `compatibility`. Ours use `name`, `description`, `metadata` (`author: Amplified Impact`, `version`) and,
  when the skill needs a connector or code execution, `compatibility` (500 characters or fewer).
- `name`: lowercase letters, numbers and hyphens, 64 characters or fewer, equal to the folder, and never
  containing "claude" or "anthropic".
- `description`: 1,024 characters or fewer (the Reel Editor's 833 upload fine), no angle brackets. Say
  what it does, the real phrases and files that should trigger it (including "even if they never
  say..."), and end with what it is not for, naming the sibling skill to use instead. Seventeen of these
  sit side by side: they must not collide.
- Body under about 150 lines (hard limit 500). Order: purpose and why it matters (two or three
  sentences), numbered steps, guardrails, then "Output, In This Order".
- **No em dashes or en dashes anywhere in any file here**, including references, practice files and the
  ChatGPT version. Use a comma, a colon, parentheses or "to".
- Every reference that states a state or industry fact has a `Last verified:` date and its source links.
  Utah-only facts live in files named `utah-*.md`. Outside Utah, a skill runs in general mode: it takes
  terms from the uploaded documents, skips the Utah notes, and says state rules were not checked.

## House rules every skill follows

- **Run, Draft, Own.** Each SKILL.md says, in its own words, what it does on its own (Run: reading,
  sorting, math), what it drafts for a person to read first (Draft: anything that goes to a client, an
  agent, a lender or title), and what stays with the person (Own: price and money decisions, wire and
  banking details, texting consent, fair housing review, and any decision about a person). No skill ever
  asks for, repeats or handles wire instructions, account or routing numbers.
- **Drafts only.** Never send, post, or write to a CRM. With a connector and the user's ask, a draft.
- **Inputs:** uploads first; a connector only when present and needed. Never ask the user to type what a
  document already contains: use a [placeholder], flag it at the top, keep going.
- **Every fact, number, date and name in an output comes from the inputs.** No invented costs, comps,
  deadlines, quotes, statistics or stories. Unclear or illegible: say so.
- **Outputs:** a bottom line first (three sentences max), then the analysis, then the drafts, then
  "Check before sending" listing every date, dollar amount, page reference and quoted fact in the drafts.
- **Client-facing writing:** Title Case subject lines, short paragraphs, no em dashes, none of "stunning",
  "dream home", "don't hesitate to reach out". Follow the user's voice profile when one is in the
  conversation (a Project's instructions such as the "My Voice" project from amplifiedimpact.io/voice-profile,
  their preferences, or a voice skill). Without one: warm, plain, direct. Sign with the user's name or
  [Agent Name].
- **Fair housing:** describe properties, documents and terms, never people. No comments on who a home
  suits, neighborhood demographics, school quality or safety; point to official sources. Leave buyer
  letters and photos out of any offer analysis.
- **Privacy:** leave out loan, account and Social Security numbers and personal financial details the
  task does not need. Agent-only MLS fields (private remarks, showing instructions, lockbox and access
  details) never appear in client-facing output.
- **Outreach:** text drafts only for contacts the user says consented; state consent and opt-out rules
  wherever a skill drafts marketing or recruiting messages.
- **Stay in lane:** not the inspector, appraiser, lender, attorney, CPA or broker. Route by role. No
  guarantees of price, timeline, appraisal outcome or acceptance. No income or revenue-share projections.
- **Connor's filters:** don't rebuild what Follow Up Boss, Sisu or a dashboard already does; don't do the
  transactions department's job (a negotiating timeline is fine when labeled "for strategy; confirm dates
  with your transactions team"); no substantial manual entry.

## The ChatGPT version (chatgpt/)

A ChatGPT Project, never a custom GPT (OpenAI retires custom GPTs on December 11, 2026).

- `instructions.md`: the skill's instructions rewritten for ChatGPT. Same steps, guardrails and output.
  No mention of Claude, skills, artifacts or Claude connectors; "the files in this project" instead of
  `references/`. It names the reference files by their exact file names.
- `paste.txt`: 1,000 characters or fewer, pasted into the Project's Instructions box. It says to follow
  `<name>-instructions.md` (the name `instructions.md` ships under) for every request, and ends with a
  line to paste the user's voice profile QUICK CARD under (from amplifiedimpact.io/voice-profile).
- At most 3 other `.md` files (merge references if needed), so the project holds 4 files and fits
  ChatGPT Free's limit of 5. They may be copies of shared references.

## practice/

Made-up, clearly fictional files in the shape the real thing arrives in: inspection reports and
appraisals as multi-page PDFs, MLS sheets and CMAs as PDFs or CSVs with realistic columns, CRM exports as
CSVs, P&Ls as XLSX or PDF. Every page and file says "PRACTICE FILE: made-up example" at the top. Made-up
street names, people, brokerages, lenders and title companies that are obviously not real. Never a real
client document. Make PDFs by writing HTML and printing it with Playwright's Chromium
(`require('playwright')` works from any directory; `page.pdf()`); XLSX with Python's openpyxl.

## evals/

`evals.json` in skill-creator's format:

```json
{ "skill_name": "due-diligence-review",
  "evals": [ { "id": 1, "prompt": "...", "expected_output": "...", "files": ["evals/files/..."],
               "expectations": ["The output ...", "..."] } ] }
```

Two or three cases per skill (the handoff's tests), each with its files and checks. The objective checks,
wherever they apply: every number in the output appears in the inputs; deadlines match the uploaded
contract; no em dashes; Title Case subject lines; a "Check before sending" section; no cost estimates
without bids; no agent-only MLS fields in client-facing text; no protected-class language.

## page-notes.md

What the page and its library card need, in plain words for team owners new to AI: the one-line promise;
who it is for; what to upload and exactly where each file comes from (the click path, checked against the
vendor's help center, with the URL and the date checked); 3 to 6 things to say to it; what comes back;
what it will not do; what the person needs (plan, connectors, accounts, any cost); the Run / Draft / Own
lines; 3 to 5 FAQs; the practice prompt (what to say with the practice files attached); suggested library
keywords; and everything that was and was not tested.
