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
- `sections`: one per item of "Output, In This Order", in that order (an item that names more than one kind becomes that many sections, still in order; the bottom line is never a section, it is `words.json`). Each: `id`, `kind`, `label` (Title Case), `finding` (one sentence), optional `note`, optional `math` (list of plain lines showing the arithmetic).

| kind | fields |
|---|---|
| `tiles` | `tiles`: `{label, value, unit, status, note}`. Big numbers. `value` is already formatted ("$98,450"). |
| `table` | `columns`: `{key, label, type}` with type `text`, `num`, `usd`, `pct` or `status`; `rows`: objects (numbers as numbers; a `pct` value is the percent, 12.1 for 12.1%, never 0.121), optional `_status` per row; optional `filters` (column keys), `sort` `{key, dir}`, `limit` (rows before Show All). |
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
  "decide": "One decision, as one plain sentence.",
  "sections": {"<section id>": {"finding": "...", "note": "..."}}
}
```

Three findings, most important first. Up to three moves. `owner` only when a person was named. `decide` only when the skill has one decision, and always a string, never an object.

## Rules the build enforces

Every number must be in `facts.json` or the user's files. No em or en dashes. Title Case headings. Every
clock time followed by MT. Never "industry standard". No sentence saying anything was sent, posted or
changed: you read and draft only. A page with drafts must end with a Check Before Sending checklist.
