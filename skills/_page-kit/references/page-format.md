# Page Format (Read Only When Building The Page)

You write two small JSON files. `scripts/build_page.py` turns them into the page. Never open or edit
`assets/base-template.html`.

## How The Page Reads

The top says the answer: a plain two-sentence headline, then 3 to 5 key numbers as tiles, then What We
Found (callouts), First Moves and Decide. Below it, one row per item of "Output, In This Order": a short
finding on the left, the proof on the right. Keep the summary open and put the rest behind Show The
Details: a full table (`detail`, or a chart's Table view), the arithmetic (`math`), the end of a long list
(`show`), or a whole row a reader rarely needs (`collapsed`). Print opens all of it.

Each kind of thing keeps its own shape, so a reader knows it at a glance: an email looks like an email, an
agenda like a run of show, a question like a prompt card, a commitment like a pledge, a set of options like
tiles to choose from. Never dress one kind as another. Pick the kind by what the output is:

| The output is | Kind | It looks like |
|---|---|---|
| The few numbers that matter most | `keyNumbers` (top) or `tiles` | Big numbers, a status word, a bar when there is a goal, plain words under each |
| A number against its goal | `progress` | A bar with a line where the goal sits, and "85 of 100.0" in words |
| A ratio or share, against a plan when there is one | `meters` | A 0 to 100 track with the plan's mark |
| Month by month, or any series | `table` with `chart` | Columns (`columns`), or one small chart per measure (`multiples`), with a Chart and Table switch |
| Two or more amounts side by side | `bars` | Horizontal bars with their amounts |
| Then and now | `deltas` | From, an arrow, to, and the change in words |
| Findings, flags, anomalies, what was read | `callouts` | A box with a status color, an icon and a word |
| What someone said or wrote | `notes` | A quotation with who said it |
| Commitments | `commitments` | A pledge: the words as given, Owner and Due chips, the status as given |
| Questions to ask or send | `questions` | A numbered prompt deck; Why Ask This opens the fact behind each |
| Options for the person to choose | `choices` | Tiles side by side, each with Pick This One |
| An agenda or a schedule | `agenda` | A run of show: clock times, a track, blocks as long as their minutes |
| Dated deadlines or a dated plan | `timeline` | Dated steps |
| An email or message | `drafts` | An email: To, Subject, blanks to fill in, Copy Draft |
| A brief, memo or one-page document | `drafts` with `"style": "memo"` | A page with headed parts and bullets |
| Check Before Sending | `checklist` | Tick boxes and a count of what is left |
| A short explanation | `prose` | Paragraphs. Use rarely |

Leave a picture out when it needs a number the skill does not compute. Never invent one to draw it.

## page.json

- `id`: skill, subject and period, for example `"agent-1on1-prep:marigold:2026-11-12"`. Keeps typed owners, ticked boxes and picked options apart between pages.
- `report`: the skill name in Title Case. `subtitle`: one line, who and when (times end in MT).
- `sample`: `"Practice File: Made-Up Example"` on any practice or made-up run. Leave it out on real runs.
- `meta`: 2 to 5 `{label, value}` pairs (Title Case labels): who, period, as-of date, source.
- `dataCheck`: list of warnings the analysis raised. They print in red at the top. Never drop one to make the page look clean.
- `keyNumbers`: 3 to 5 tiles (five at most), the numbers a reader needs first, each `{label, value, status, chip, means, bar, delta, unit}` as in `tiles` below.
- `headline`, `findings`, `moves`, `decide`: put these in `words.json` instead (below).
- `sections`: one per item of "Output, In This Order", in that order (an item that names more than one kind becomes that many sections, still in order; the bottom line is never a section, it is `words.json`).

Every section has `id`, `kind`, `label` (Title Case) and `finding` (one sentence), and may have:
`note` (a sentence under the finding), `callout` (`{text, status, chip}`: the one thing that matters in
the row, said big), `math` (plain lines of arithmetic, behind Show The Math), `detail` (`{label, columns,
rows, sort}`: a full table behind Show The Table), `collapsed: true` (the whole proof behind Show The
Details) and `show` (in `questions` and `callouts`: how many stay open before Show All).

| kind | fields |
|---|---|
| `tiles` | `tiles`: `{label, value, unit, status, chip, means, note, bar, delta}`. `value` is already formatted ("$98,450"). `bar`: `{value, goal}`, both numbers from the facts. `delta`: `{dir, text}` with `dir` `up`, `down` or `flat` and the change in words ("Up $6,611 from August"). `means`: what the number means, in plain words. |
| `table` | `columns`: `{key, label, type}` with type `text`, `num`, `usd`, `usd2` (cents), `pct`, `change` (a number shown with an arrow and "up" or "down"; set `format`) or `status`; `rows`: objects (numbers as numbers; a `pct` value is the percent, 12.1 for 12.1%, never 0.121), optional `_status` per row (it colors the row's chart column too) and `_partial` (hatched); optional `filters`, `sort` `{key, dir}`, `limit`. Optional `chart`: `{type, x, series, legend}` with `type` `columns` or `multiples`, `x` the column for the labels, `series` `[{key, label}]` (columns of this table), `legend` `[{label, status}]` for what a color or hatch means. |
| `progress` | `items`: `{label, value, goal, valueText, goalText, pctText, status, chip, text, math}`. `value` and `goal` are numbers; the texts are what the reader sees. Section `goalLegend` says what the line marks. |
| `meters` | `items`: `{label, value, target, valueText, targetText, status, chip, text}`. `value` and `target` are percents from 0 to 100. |
| `bars` | `items`: `{label, text, bars: [{label, value, text, status}]}`. Section `scale`: `shared` (one scale for every row, the default) or `item` (each row its own, for rows in different units). |
| `deltas` | `items`: `{label, from, to, fromLabel, toLabel, change, dir, text}`. Leave `dir` out where the skill's rules say not to call a move up or down. |
| `callouts` | `items`: `{title, text, status, chip}`. No status is a plain fact. |
| `notes` | `items`: `{title, text, source}`. `source` says who said it ("Your notes", "She says"). |
| `commitments` | `items`: `{title, words, owner, due, status, chip, statusText, fact}`. `words` exactly as given; `owner` and `due` only from the commitment itself; `statusText` exactly as given, with its source. Status `quiet` marks "No status given". |
| `questions` | `items`: `{tag, ask, why}`. `tag` is what the question is about (Title Case), `ask` the question, `why` the fact behind it. |
| `choices` | `items`: `{title, big, bigLabel, bar, facts, open}`. `facts` is a list of short lines; `open` is a line to start with. Section `pickable: false` turns off Pick This One. |
| `agenda` | `items`: `{time, minutes, title, text}`. Section `when`: the meeting, in words. |
| `list` | `items`: `{status, title, text, math}`. Plain lists. |
| `timeline` | `items`: `{date, title, text, status}`. Dated plans and deadlines. |
| `drafts` | `drafts`: `{label, to, channel, subject, body, flag, style}`. Every outgoing message. Subjects in Title Case. `channel` says where it goes ("Gmail draft", "FUB note"). `style: "memo"` for a brief: write its body as "Heading: text" lines, with "- " bullets. A [Placeholder] shows as a blank to fill in. |
| `checklist` | `items`: `{text, source}`. Check Before Sending: every date, dollar amount, name and quoted fact in the drafts, with the file to check it against. Always the last section. |
| `prose` | `paragraphs`: short plain paragraphs. Use rarely. |

Statuses: `on` (good), `off` (problem), `hold` (Watch), `quiet` (No Data). Each shows with an icon and a
word, never color alone. `chip` replaces the word: use the skill's own factual words where its rules forbid
a verdict ("Under Goal", not "Off Track").

## words.json

```json
{
  "headline": ["Two short sentences.", "About six words each."],
  "findings": [{"status": "off", "text": "One sentence with the number."}],
  "moves": [{"title": "Imperative Title Case", "text": "How, with the number.", "tag": "What it fixes", "owner": ""}],
  "decide": "One decision, as one plain sentence.",
  "sections": {"<section id>": {"finding": "...", "note": "..."}}
}
```

Three findings, most important first. Up to three moves. `owner` only when a person was named. `decide` only when the skill has one decision, and always a string, never an object.

## Words And Numbers On The Page

- Plain words beside every number: what it means, not only what it is ("11 closings so far; her goal by now is 18").
- Dollars: whole dollars with "$" in sentences, tiles and drafts ("$6,611"). Keep cents only for a charge someone will look up in the books ("$486.20"), and never ".00". The arithmetic keeps the run's cents, with "$". A rounded figure must round from a figure in the facts.
- Times: write each clock time in MT, both ends of a range. The build adds the CT time beside it ("12:00 PM MT / 1:00 PM CT").
- Wrap one or two key phrases a row in `**double asterisks**` to highlight them. No more.
- Short sentences. One idea per sentence. Lists of things go in the kind made for them, not in a paragraph.

## Rules The Build Enforces

Every number must be in `facts.json` or the user's files. No em or en dashes. Title Case headings. Every
clock time followed by MT, and its CT time an hour later. Never "industry standard". No sentence saying
anything was sent, posted or changed: you read and draft only. A page with drafts must end with a Check
Before Sending checklist. At most five key numbers. Each kind's own fields: a bar needs its number and its
goal, a meter a percent from 0 to 100, an agenda block its minutes, a chart columns of its own table.
