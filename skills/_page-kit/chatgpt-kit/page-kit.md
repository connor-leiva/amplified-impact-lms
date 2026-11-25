# Page Kit (For Building The Report Page)

Use this file only when the instructions say to build the page. In code (Python), save the block under
"build_page.py" below as build_page.py and the block under "base-template.html" as base-template.html,
in the same folder, exactly as written. Do not change either file. Write page.json and words.json as
"Page Format" below says. Then run:

    python build_page.py page.json --words words.json --facts facts.json --template base-template.html --fonts none --out <File-Name>.html

and give the person the download link for the .html file right away. The link stops working when the
code session ends, so tell them to download it now. If the link fails, run the code again for a new link.

## Page Format

The two files below are build_page.py and base-template.html here, side by side in one folder.

You write two small JSON files. `scripts/build_page.py` turns them into the page. Never open or edit
`assets/base-template.html`.

### How The Page Reads

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

### page.json

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
the row, said big), `math` (a list of plain lines of arithmetic, behind Show The Math; a list even for one line), `detail` (`{label, columns,
rows, sort}`: a full table behind Show The Table), `collapsed: true` (the whole proof behind Show The
Details) and `show` (in `questions` and `callouts`: how many stay open before Show All).

| kind | fields |
|---|---|
| `tiles` | `tiles`: `{label, value, unit, status, chip, means, note, bar, delta}`. `value` is already formatted ("$98,450"). `bar`: `{value, goal}`, both numbers from the facts. `delta`: `{dir, text}` with `dir` `up`, `down` or `flat` and the change in words ("Up $6,611 from August"). `means`: what the number means, in plain words. |
| `table` | `columns`: `{key, label, type}` with type `text`, `num`, `usd`, `usd2` (cents), `pct`, `change` (a number shown with an arrow and "up" or "down"; set `format`) or `status`; `rows`: objects (numbers as numbers; a `pct` value is the percent, 12.1 for 12.1%, never 0.121), optional `_status` per row (it colors the row's chart column too) and `_partial` (hatched); optional `filters`, `sort` `{key, dir}`, `limit`. Optional `chart`: `{type, x, series, legend}` with `type` `columns` or `multiples`, `x` the column for the labels, `series` `[{key, label}]` (columns of this table), `legend` `[{label, status}]` for what a color or hatch means. |
| `progress` | `items`: `{label, value, goal, valueText, goalText, pctText, status, chip, text, math}`. `value` and `goal` are numbers; the texts are what the reader sees. With no goal, leave `goal` out: the number and its words show, with no bar. A measure with no total stays out (say why in the note). Section `goalLegend` says what the line marks. |
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

### words.json

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

### Words And Numbers On The Page

- Plain words beside every number: what it means, not only what it is ("11 closings so far; her goal by now is 18").
- Dollars: whole dollars with "$" in sentences, tiles and drafts ("$6,611"). Keep cents only for a charge someone will look up in the books ("$486.20"), and never ".00". The arithmetic keeps the run's cents, with "$". A rounded figure must round from a figure in the facts.
- Times: write each clock time in MT, both ends of a range. The build adds the CT time beside it ("12:00 PM MT / 1:00 PM CT").
- Wrap one or two key phrases a row in `**double asterisks**` to highlight them. No more.
- Short sentences. One idea per sentence. Lists of things go in the kind made for them, not in a paragraph.

### Rules The Build Enforces

Every number must be in `facts.json` or the user's files. No em or en dashes. Title Case headings. Every
clock time followed by MT, and its CT time an hour later. Never "industry standard". No sentence saying
anything was sent, posted or changed: you read and draft only. A page with drafts must end with a Check
Before Sending checklist. At most five key numbers. Each kind's own fields: a bar needs its number and its
goal, a meter a percent from 0 to 100, an agenda block its minutes, a chart columns of its own table.

## build_page.py

~~~~~~python
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
            the skill has no script. Shape and section kinds: references/page-format.md.
words.json  optional. The sentences that need judgment, written by the model. Replaces the
            headline, findings, moves, decide, and any section's finding or note.
--facts     optional, repeatable. JSON files the skill's scripts wrote. Every number in the
            words must appear in them (or in page.json). Strays stop the build.
--inputs    optional, repeatable. The user's own files (CSV, TXT, MD, JSON). For skills
            without scripts, numbers in the page may come from these too.

Checks that STOP the build (exit 1), each with a plain message:
  1. Shape: report name, a headline of one or two sentences, known section kinds and statuses,
     at most five key numbers, and each section kind's own fields (a bar needs its number and its
     goal, a meter a percent from 0 to 100, an agenda block its minutes, a chart its columns).
  2. Banned words: "industry standard", "industry average"; client-facing filler
     ("stunning", "dream home", "don't hesitate to reach out").
  3. A sentence that claims the page sent, posted or changed something. Hires read and draft only.
  4. A number in the words that is not in the facts, the page data or the inputs. A whole-dollar
     figure ("$6,611") passes when it is a figure in the facts rounded to the dollar (6,610.89).
  5. A clock time with no "MT" after it (pass --tz-label to change the label), or an MT time whose
     CT time beside it is wrong. Every MT time gets its CT time added: "12:00 PM MT / 1:00 PM CT"
     (--tz-second sets the second zone and its offset, "CT:+1" by default, "none" for one zone).
  6. A heading, section label, move title or draft subject that is not in Title Case.
Fixed with a NOTE (build goes on): em and en dashes in any text become commas or "to", and a
dollar amount ending in ".00" loses it ("$79.00" becomes "$79"), except in arithmetic (math lines and
table cells keep the run's cents).
Standard library only. Python 3.7 or later.
"""
import argparse
import json
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SLOT_DATA, SLOT_FONTS, SLOT_TITLE = "/*PAGE_DATA*/", "/*FONTS*/", "/*PAGE_TITLE*/"
KINDS = {"table", "tiles", "list", "timeline", "drafts", "checklist", "prose",
         "progress", "meters", "bars", "deltas", "callouts", "notes", "commitments", "questions", "choices", "agenda"}
NOT_TEXT = {"key", "type", "kind", "id", "status", "style", "format", "dir", "scale", "x", "icon", "sortKey"}
CLOCK = r"(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s?(?:AM|PM|am|pm|a\.m\.|p\.m\.)"
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


def clean(text, notes, arithmetic=False):
    """House style: no em dashes or en dashes; no ".00" on a dollar amount, except in arithmetic."""
    if not isinstance(text, str):
        return text
    out = re.sub(r"(?<=\d)\s*[\u2013\u2014]\s*(?=\d)", " to ", text)
    out = out.replace(" \u2014 ", ", ").replace("\u2014", ", ").replace(" \u2013 ", ", ").replace("\u2013", "-")
    if out != text:
        notes.append("Dashes replaced in: %s" % text[:70])
    if arithmetic:
        return out
    cents = re.sub(r"(\$\d[\d,]*)\.00(?![\d])", r"\1", out)
    if cents != out:
        notes.append("Dropped .00 from a dollar amount in: %s" % out[:70])
    return cents


def deep_clean(node, notes, arithmetic=False):
    """Arithmetic (a section's math lines and a table's cells) keeps the run's cents."""
    if isinstance(node, dict):
        return {k: deep_clean(v, notes, arithmetic or k in ("math", "rows")) for k, v in node.items()}
    if isinstance(node, list):
        return [deep_clean(v, notes, arithmetic) for v in node]
    return clean(node, notes, arithmetic)


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
                if k.startswith("_") or k in NOT_TEXT:
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
    for k in page.get("keyNumbers") or []:
        out.append(("key number label", k.get("label", "")))
    for s in page.get("sections") or []:
        for it in s.get("items") or []:
            if not isinstance(it, dict):
                continue
            if s.get("kind") in ("progress", "meters", "bars", "deltas"):
                out.append(("%s label" % s.get("kind"), it.get("label", "")))
            elif s.get("kind") in ("callouts", "notes", "choices", "agenda", "commitments"):
                out.append(("%s title" % s.get("kind"), it.get("title", "")))
            elif s.get("kind") == "questions":
                out.append(("question tag", it.get("tag", "")))
        for c in (s.get("detail") or {}).get("columns") or []:
            out.append(("column", c.get("label", "")))
        for se in (s.get("chart") or {}).get("series") or []:
            out.append(("chart series", se.get("label", "")))
    return [(w, t) for w, t in out if t]


LISTS = ("math", "facts", "paragraphs")


def as_lists(node):
    """A field that holds lines ("math", "facts", "paragraphs") written as one string becomes a one-line list."""
    if isinstance(node, dict):
        return {k: ([v] if k in LISTS and isinstance(v, str) else as_lists(v)) for k, v in node.items()}
    if isinstance(node, list):
        return [as_lists(v) for v in node]
    return node


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
    keys = page.get("keyNumbers") or []
    if len(keys) > 5:
        problems.append("at most five key numbers. Pick the ones a reader needs first.")
    for k in keys:
        check_item(k, "a key number", ("label", "value"), problems)
        if k.get("bar") is not None:
            check_bar(k.get("bar"), "key number '%s'" % k.get("label"), problems)
    seen = set()
    for i, s in enumerate(page.get("sections") or []):
        if s.get("kind") not in KINDS:
            problems.append("section %d has kind %r. Use one of: %s" % (i, s.get("kind"), ", ".join(sorted(KINDS))))
        sid = s.get("id") or str(i)
        if sid in seen:
            problems.append("two sections share the id '%s'." % sid)
        seen.add(sid)
        check_kind(s, problems)
    if not any(s.get("kind") == "checklist" for s in page.get("sections") or []) and any(
            s.get("kind") == "drafts" for s in page.get("sections") or []):
        problems.append('a page with drafts needs a "checklist" section (Check Before Sending) listing every date, '
                        "dollar amount, name and quoted fact in the drafts.")


def is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def check_item(it, what, needs, problems):
    if not isinstance(it, dict):
        problems.append("%s must be an object with %s." % (what, ", ".join(needs)))
        return False
    missing = [k for k in needs if it.get(k) in (None, "")]
    if missing:
        problems.append("%s needs %s. Got: %s" % (what, " and ".join(missing), json.dumps(it, ensure_ascii=False)[:120]))
    if str(it.get("status", "")) not in STATUSES:
        problems.append("%s has status %r. Use on, off, hold or quiet." % (what, it.get("status")))
    return not missing


def check_bar(bar, what, problems):
    if not isinstance(bar, dict) or not is_num(bar.get("value")) or not is_num(bar.get("goal")) or bar.get("goal") <= 0:
        problems.append("%s: a bar needs a number \"value\" and a number \"goal\" above 0, both from the facts." % what)


def check_kind(s, problems):
    """Each section kind's own fields, so a page never draws an empty bar or a meter past 100%."""
    kind, label = s.get("kind"), s.get("label") or s.get("id")
    items = s.get("items")
    needs = {"progress": ("label",), "meters": ("label",), "bars": ("label",), "deltas": ("label", "to"),
             "callouts": (), "notes": ("text",), "commitments": ("words",), "questions": ("ask",),
             "choices": ("title",), "agenda": ("time", "title")}
    if kind in needs:
        if not isinstance(items, list) or not items:
            problems.append('section "%s" (%s) needs "items": a list with at least one.' % (label, kind))
            return
        for n, it in enumerate(items):
            what = 'section "%s" item %d' % (label, n + 1)
            if not check_item(it, what, needs[kind], problems):
                continue
            if kind == "progress" and (not is_num(it.get("value")) or ("goal" in it and (not is_num(it.get("goal")) or it["goal"] <= 0))):
                problems.append('%s: progress needs a number "value" and, when there is a goal, a number "goal" above 0.' % what)
            if kind == "meters":
                for f in ("value", "target"):
                    if f in it and (not is_num(it[f]) or not 0 <= it[f] <= 100):
                        problems.append('%s: a meter\'s "%s" is a percent from 0 to 100 (12.1, not 0.121).' % (what, f))
                if not is_num(it.get("value")):
                    problems.append('%s: a meter needs a number "value".' % what)
            if kind == "bars" and (not it.get("bars") or not all(isinstance(b, dict) and is_num(b.get("value")) for b in it["bars"])):
                problems.append('%s: "bars" is a list of {label, value, text} with a number value each.' % what)
            if kind == "agenda" and (not is_num(it.get("minutes")) or it["minutes"] <= 0):
                problems.append('%s: an agenda block needs its "minutes" as a number above 0.' % what)
            if kind == "callouts" and not (it.get("title") or it.get("text")):
                problems.append("%s: a callout needs a title or a text." % what)
    chart = s.get("chart")
    if chart is not None:
        cols = {c.get("key") for c in s.get("columns") or []}
        if kind != "table":
            problems.append('section "%s": only a table carries a chart.' % label)
        elif chart.get("type", "columns") not in ("columns", "multiples"):
            problems.append('section "%s": chart type is "columns" or "multiples".' % label)
        elif chart.get("x") not in cols or not chart.get("series") or any(se.get("key") not in cols for se in chart["series"]):
            problems.append('section "%s": the chart\'s "x" and every "series" key must be columns of the table.' % label)
    detail = s.get("detail")
    if detail is not None and (not isinstance(detail, dict) or not detail.get("columns") or not isinstance(detail.get("rows"), list)):
        problems.append('section "%s": "detail" is a table: {columns, rows}.' % label)


def shift_clock(token, hours):
    m = re.match(r"(1[0-2]|0?[1-9])(?::([0-5]\d))?\s?(AM|PM|am|pm|a\.m\.|p\.m\.)", token)
    h24 = int(m.group(1)) % 12 + (12 if m.group(3).lower().startswith("p") else 0)
    h24 = (h24 + hours) % 24
    pm = h24 >= 12
    style = m.group(3)
    word = ("PM" if pm else "AM") if style in ("AM", "PM") else ("pm" if pm else "am") if style in ("am", "pm") else ("p.m." if pm else "a.m.")
    return "%d%s %s" % (h24 % 12 or 12, ":" + m.group(2) if m.group(2) else "", word)


def same_clock(a, b):
    return re.sub(r"\s", "", a).lower() == re.sub(r"\s", "", b).lower()


def zones(page, first, second, problems):
    """Every first-zone time gets its second-zone time beside it; every time must carry a zone."""
    if second:
        label2, hours = second
        rng = re.compile(r"(%s)(?:\s*%s)?\s+to\s+(%s)\s*%s(?!\s*/)" % (CLOCK, re.escape(first), CLOCK, re.escape(first)))
        one = re.compile(r"(%s)\s*%s(?!\s*/)" % (CLOCK, re.escape(first)))

        def add(text):
            if not isinstance(text, str):
                return text
            text = rng.sub(lambda m: "%s to %s %s / %s to %s %s" % (m.group(1), m.group(2), first, shift_clock(m.group(1), hours),
                                                                  shift_clock(m.group(2), hours), label2), text)
            return one.sub(lambda m: "%s %s / %s %s" % (m.group(1), first, shift_clock(m.group(1), hours), label2), text)

        def walk(node, key=""):
            if isinstance(node, dict):
                return {k: (v if k.startswith("_") or k in NOT_TEXT else walk(v, k)) for k, v in node.items()}
            if isinstance(node, list):
                return [walk(v, key) for v in node]
            return add(node)
        page = walk(page)
        pair_rng = re.compile(r"(%s) to (%s) %s / (%s) to (%s) %s" % (CLOCK, CLOCK, re.escape(first), CLOCK, CLOCK, re.escape(label2)))
        pair_one = re.compile(r"(%s)\s*%s\s*/\s*(%s)\s*%s" % (CLOCK, re.escape(first), CLOCK, re.escape(label2)))
    for where, t in texts(page):
        rest = t
        if second:
            for m in pair_rng.finditer(t):
                if not (same_clock(shift_clock(m.group(1), hours), m.group(3)) and same_clock(shift_clock(m.group(2), hours), m.group(4))):
                    problems.append('The %s times in "%s" are not %d hour(s) after the %s times. At %s.' % (label2, m.group(0), hours, first, where))
            rest = pair_rng.sub(" ", rest)
            for m in pair_one.finditer(rest):
                if not same_clock(shift_clock(m.group(1), hours), m.group(2)):
                    problems.append('The %s time in "%s" is not %d hour(s) after the %s time. At %s.' % (label2, m.group(0), hours, first, where))
            rest = pair_one.sub(" ", rest)
        for m in TIME.finditer(rest):
            tail = rest[m.end():m.end() + 30]
            if second and re.match(r"\s*%s" % re.escape(second[0]), tail):
                problems.append('The time "%s" needs "%s" after it, with the %s time beside it: "%s / %s". At %s.' % (
                    m.group(0), first, second[0], "H:MM AM " + first, "H:MM AM " + second[0], where))
            elif not re.match(r"\s*(%s|Mountain)" % re.escape(first), tail) and not re.match(r"\s+to\s+%s\s*%s" % (CLOCK, re.escape(first)), tail):
                problems.append('The time "%s" needs "%s" after it. At %s.' % (m.group(0), first, where))
    return page


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
    ap.add_argument("--tz-second", default="CT:+1", help='the zone shown beside it and its offset in hours (default "CT:+1"; "none" for one zone)')
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
    page = deep_clean(as_lists(page), notes)
    check_shape(page, problems)

    # numbers: facts and inputs are the only places a number may come from
    allowed = set(SAFE_NUMBERS) | {norm(n) for n in args.allow_number}
    for fp in args.facts:
        allowed |= numbers_in(json.dumps(load(fp, "facts file"), ensure_ascii=False))
    for ip in args.inputs:
        if os.path.exists(ip):
            with open(ip, "rb") as f:
                head = f.read(5)
            if head.startswith(b"PK\x03\x04") or head.startswith(b"%PDF") or b"\x00" in head:
                warnings.append("Not read as text, so its numbers were not loaded: %s. Pass the run's JSON with --facts, "
                                "and text or CSV files with --inputs." % ip)
                continue
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
    rounded = set()
    for tok in allowed:
        if re.match(r"^\d+\.\d+$", tok):
            x = float(tok)
            rounded |= {str(int(round(x))), str(int(math.floor(x + 0.5)))}
    dollars = {norm(m) for m in NUMBER.findall(written) if m.startswith("$")}
    strays = sorted((n for n in numbers_in(written) - allowed if not (n in dollars and n in rounded)),
                    key=lambda t: float(t) if re.match(r"^\d+(\.\d+)?$", t) else 0)
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
    second = None
    if args.tz_second and args.tz_second.lower() != "none":
        lab, _, off = args.tz_second.partition(":")
        try:
            second = (lab.strip(), int(off or "1"))
        except ValueError:
            sys.exit('--tz-second looks like "CT:+1": a zone label, a colon and its hours after --tz-label.')
    page = zones(page, args.tz_label, second, problems)
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
~~~~~~

## base-template.html

~~~~~~html
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
   Layout: the bottom line first (a plain headline, then the key numbers), then one row per question,
   the finding on the left and the proof on the right. The summary stays open; tables, arithmetic and long
   lists wait behind a Show The Details control. Each kind of thing looks like itself: an email is an email,
   an agenda is a run of show, a question is a prompt card, a commitment is a pledge, a choice is a tile.
   Green, amber and red appear only where something is on, on watch or off, always with a word or an icon.
   Everything a run changes lives in the JSON block below. Never restyle this file per skill: add a section
   kind here once, for every skill. */
:root {
  color-scheme: light;
  --surface: #f1f0eb; --raised: #fafaf7; --paper: #ffffff; --ink: #0a0d0c; --ink-2: #4d5350; --ink-3: #5e6461;
  --accent: #1f4d40; --line: #dad8d0; --line-2: #7c8580; --track: #dedcd3;
  --good: #1f8a5c; --good-ink: #1f4d40; --hold: #a88400; --hold-ink: #5f4a00; --bad: #a82a2a; --bad-ink: #7a1f14;
  --good-wash: color-mix(in srgb, var(--good) 14%, var(--surface));
  --hold-wash: color-mix(in srgb, var(--hold) 18%, var(--surface));
  --bad-wash: color-mix(in srgb, var(--bad) 12%, var(--surface));
  --accent-wash: color-mix(in srgb, var(--accent) 9%, var(--surface));
  --hl: color-mix(in srgb, var(--accent) 16%, transparent);
  --series-2: #9aa29e;
  --dark-bg: #0a0d0c; --dark-ink: #f1f0eb; --dark-ink-2: #a3aba7; --dark-accent: #6fd3a5; --dark-line: #262d2a;
  --sans: "Geist", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
}
@media screen and (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --surface: #0a0d0c; --raised: #111614; --paper: #151b18; --ink: #f5f5f2; --ink-2: #a3aba7; --ink-3: #8b9490;
    --accent: #6fd3a5; --line: #1e2522; --line-2: #5c6762; --track: #232b28;
    --good: #6fd3a5; --good-ink: #6fd3a5; --hold: #e8c547; --hold-ink: #f0d57a; --bad: #f0705c; --bad-ink: #ffa392;
    --good-wash: color-mix(in srgb, var(--good) 20%, var(--surface));
    --hold-wash: color-mix(in srgb, var(--hold) 24%, var(--surface));
    --bad-wash: color-mix(in srgb, var(--bad) 24%, var(--surface));
    --accent-wash: color-mix(in srgb, var(--accent) 12%, var(--surface));
    --hl: color-mix(in srgb, var(--accent) 22%, transparent);
    --series-2: #5c6762;
    --dark-bg: #111614; --dark-line: #1e2522;
  }
}
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body { margin: 0; background: var(--surface); color: var(--ink); font: 400 17px/1.6 var(--sans); -webkit-font-smoothing: antialiased; }
h1, h2, h3, h4, p, ul, ol, dl, dd, figure, blockquote { margin: 0; padding: 0; }
ul, ol { list-style: none; }
button, input { font: inherit; color: inherit; }
.page { max-width: 1180px; margin: 0 auto; padding: 0 32px 56px; }
.label, .eyebrow { font: 400 12px/1.4 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-2); }
.eyebrow { color: var(--accent); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
strong.hl { font-weight: 500; color: var(--ink); background: var(--hl); padding: 0 .15em; }
.lockup { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--line); }
.lockup-end { border-bottom: 0; border-top: 1px solid var(--line); margin-top: 40px; }
.lockup-by { font: 400 12px/1.4 var(--mono); letter-spacing: .16em; text-transform: uppercase; color: var(--ink-2); }
.wordmark { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; letter-spacing: -0.01em; }
.mark { width: 18px; height: 18px; }
.top { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 28px 0 14px; flex-wrap: wrap; }
.top-act { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.btn { min-height: 36px; padding: 0 14px; border: 1px solid var(--ink); background: transparent; border-radius: 0; cursor: pointer; font-size: 14px; }
.btn:hover { background: var(--ink); color: var(--surface); }
button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (pointer: coarse) { .btn, .disc-toggle, .vt, .why-toggle, .pick { min-height: 44px; } }
.sample { font: 500 12px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; padding: 8px 10px; background: var(--hold-wash); color: var(--hold-ink); }
.strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); border-top: 2px solid var(--ink); border-bottom: 1px solid var(--line); }
.strip > div { padding: 14px 16px 16px 0; }
.strip dd { margin-top: 4px; font-size: 17px; font-weight: 500; }
.data-check { margin: 18px 0 0; padding: 16px 18px; background: var(--bad-wash); border-left: 4px solid var(--bad); }
.data-check-label { display: flex; gap: 8px; align-items: center; font: 500 13px/1.4 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--bad-ink); }
.data-check-label svg { width: 14px; height: 14px; flex: none; }
.data-check li { margin-top: 6px; list-style: disc; margin-left: 20px; }
.draw-error { padding: 14px 16px; background: var(--bad-wash); color: var(--bad-ink); border-left: 4px solid var(--bad); }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; font: 500 11px/1.4 var(--mono); letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
.chip svg { width: 12px; height: 12px; flex: none; }
.chip.on { background: var(--good-wash); color: var(--good-ink); }
.chip.off { background: var(--bad-wash); color: var(--bad-ink); }
.chip.hold { background: var(--hold-wash); color: var(--hold-ink); }
.chip.quiet { background: var(--track); color: var(--ink-2); }
.toc { display: flex; flex-wrap: wrap; gap: 6px 18px; padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
.toc a { color: var(--ink-2); text-decoration: none; border-bottom: 1px solid var(--line-2); }
.toc a:hover { color: var(--ink); }

/* ----- the bottom line ----- */
.bottom { padding: 40px 0 44px; border-bottom: 2px solid var(--ink); }
.headline { margin-top: 10px; font-size: clamp(36px, 6vw, 68px); line-height: 1.02; letter-spacing: -0.035em; font-weight: 500; max-width: 18ch; }
.keys { margin-top: 32px; }
.summary { display: grid; grid-template-columns: repeat(12, 1fr); gap: 28px; margin-top: 36px; }
.found { grid-column: span 5; }
.found.wide { grid-column: span 12; }
.found > ul { margin-top: 10px; display: grid; gap: 10px; }
.found.wide > ul { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
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
.owner-in::placeholder { color: var(--dark-ink-2); }
.decide { margin-top: 10px; padding: 18px 0 14px; border-top: 1px solid var(--dark-line); }
.decide p { margin-top: 8px; font-size: 21px; line-height: 1.35; color: var(--dark-ink); }

/* ----- rows: the rail on the left, the proof on the right ----- */
.row { display: grid; grid-template-columns: repeat(12, 1fr); gap: 28px; padding: 44px 0; border-bottom: 1px solid var(--line); }
.rail { grid-column: span 4; }
.rail-in { position: sticky; top: 20px; border-left: 3px solid var(--accent); padding-left: 16px; }
.sec-num { display: inline-block; margin-right: 10px; color: var(--ink-2); }
.rail h2 { margin-top: 10px; font-size: 26px; line-height: 1.18; letter-spacing: -0.02em; font-weight: 500; }
.rail .note { margin-top: 12px; color: var(--ink-2); max-width: 42ch; font-size: 16px; }
.proof { grid-column: span 8; display: grid; gap: 20px; min-width: 0; align-content: start; }
.muted { color: var(--ink-2); }

/* Show The Details: one disclosure for tables, arithmetic and long lists. Print opens every one. */
.disc-toggle { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; gap: 8px; align-items: center; min-height: 32px; font: 500 12px/1.4 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--accent); border-bottom: 1px solid var(--accent); }
.disc-toggle svg { width: 12px; height: 12px; transition: transform .15s; }
.disc-toggle[aria-expanded="true"] svg { transform: rotate(180deg); }
.disc-body { margin-top: 14px; display: grid; gap: 16px; }
.math-body { padding: 14px 16px; background: var(--raised); border-left: 2px solid var(--accent); font: 400 13px/1.6 var(--mono); }
.math-body p { margin-bottom: 8px; color: var(--ink-2); }
.math-body li + li { margin-top: 4px; }

/* Callout: the one thing that matters in a row, said big. */
.callout { padding: 18px 22px; background: var(--accent-wash); border-left: 4px solid var(--accent); font-size: 21px; line-height: 1.38; letter-spacing: -0.01em; }
.callout .chip { margin-bottom: 10px; }
.callout.on { background: var(--good-wash); border-left-color: var(--good); }
.callout.hold { background: var(--hold-wash); border-left-color: var(--hold); }
.callout.off { background: var(--bad-wash); border-left-color: var(--bad); }

/* Tiles and key numbers: the number, a word for its status, a bar when there is a goal, plain words under it. */
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); border-top: 1px solid var(--line); border-left: 1px solid var(--line); }
.tile { background: var(--raised); padding: 16px 18px 18px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); display: grid; gap: 8px; align-content: start; }
.tile-head { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; flex-wrap: wrap; }
.tile-num { display: block; font-size: 40px; line-height: 1; letter-spacing: -0.03em; font-weight: 500; font-variant-numeric: tabular-nums; white-space: nowrap; }
.keys .tile-num { font-size: 44px; }
.tile-unit { color: var(--ink-2); font-size: 14px; }
.tile-means { font-size: 15px; line-height: 1.45; }
.tile-note { color: var(--ink-2); font-size: 14px; }
.delta { display: inline-flex; gap: 6px; align-items: center; font-size: 14px; font-weight: 500; }
.delta svg { width: 11px; height: 11px; flex: none; }

/* Progress toward a goal: the bar, a line where the goal sits, the numbers in words. */
.pbar { position: relative; height: 10px; background: var(--track); margin: 4px 0 2px; }
.pbar-fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent); }
.pbar.on .pbar-fill { background: var(--good); }
.pbar.hold .pbar-fill { background: var(--hold); }
.pbar.off .pbar-fill { background: var(--bad); }
.pbar-goal { position: absolute; top: -5px; bottom: -5px; width: 2px; margin-left: -1px; background: var(--ink); }
.progress { display: grid; gap: 0; border-top: 2px solid var(--ink); }
.prog { display: grid; grid-template-columns: minmax(0, 11rem) minmax(0, 1fr); gap: 6px 24px; padding: 16px 0; border-bottom: 1px solid var(--line); align-items: start; }
.prog h3 { font-size: 17px; font-weight: 500; }
.prog .chip { margin-top: 6px; }
.prog-nums { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; font-size: 15px; }
.prog-nums b { font-size: 22px; font-weight: 500; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.prog-text { margin-top: 4px; font-size: 15px; color: var(--ink-2); }
.legend-line { display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--ink-2); }
.legend-line i { display: inline-block; width: 2px; height: 14px; background: var(--ink); }

/* Meters: a ratio on a 0 to 100 track, with the plan's mark when there is one. */
.meters { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
.meter { background: var(--raised); border: 1px solid var(--line); padding: 16px 18px; display: grid; gap: 8px; align-content: start; }
.meter h3 { font-size: 16px; font-weight: 500; }
.meter-track { position: relative; height: 14px; background: var(--track); }
.meter-fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent); }
.meter.hold .meter-fill { background: var(--hold); }
.meter.on .meter-fill { background: var(--good); }
.meter.off .meter-fill { background: var(--bad); }
.meter-mark { position: absolute; top: -6px; bottom: -6px; width: 2px; margin-left: -1px; background: var(--ink); }
.meter-scale { display: flex; justify-content: space-between; font: 400 11px/1 var(--mono); color: var(--ink-2); }
.meter-big { font-size: 28px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.1; font-variant-numeric: tabular-nums; }
.meter-text { font-size: 15px; color: var(--ink-2); }

/* Bars: side-by-side amounts, each row with its own words. */
.hbars { display: grid; gap: 18px; }
.hbars.pairs { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 22px 28px; }
.hbars.pairs .hbar { grid-template-columns: minmax(0, 8rem) minmax(0, 1fr) auto; }
.hbar-item h3 { font-size: 16px; font-weight: 500; }
.hbar-item > p { font-size: 14px; color: var(--ink-2); margin-top: 2px; }
.hbar { display: grid; grid-template-columns: minmax(0, 9rem) minmax(0, 1fr) auto; gap: 10px; align-items: center; margin-top: 6px; font-size: 14px; }
.hbar.solo { grid-template-columns: minmax(0, 1fr) auto; }
.hbar-track { height: 16px; background: var(--track); position: relative; }
.hbar-fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent); }
.hbar-fill.b2 { background: var(--series-2); }
.hbar-fill.on { background: var(--good); } .hbar-fill.hold { background: var(--hold); } .hbar-fill.off { background: var(--bad); }
.hbar-val { font-variant-numeric: tabular-nums; font-weight: 500; white-space: nowrap; }

/* Deltas: then and now, the change in words. */
.deltas { border-top: 2px solid var(--ink); }
.dl-row { display: grid; grid-template-columns: minmax(0, 10rem) minmax(0, 1fr) auto; gap: 6px 18px; padding: 14px 0; border-bottom: 1px solid var(--line); align-items: baseline; }
.dl-row h3 { font-size: 16px; font-weight: 500; }
.dl-move { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-variant-numeric: tabular-nums; }
.dl-move .from { color: var(--ink-2); }
.dl-move .to { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
.dl-move svg { width: 14px; height: 14px; color: var(--ink-2); align-self: center; }
.dl-change { display: inline-flex; gap: 6px; align-items: center; font-size: 14px; font-weight: 500; padding: 3px 8px; background: var(--track); white-space: nowrap; }
.dl-change svg { width: 11px; height: 11px; }
.dl-text { grid-column: 2 / -1; font-size: 14px; color: var(--ink-2); }

/* Charts: plain columns from the table's own rows. Every value is also in the table. */
.chart { display: grid; gap: 8px; }
.plot { position: relative; height: 190px; display: flex; gap: 6px; }
.colg { position: relative; flex: 1 1 0; min-width: 0; }
.bar { position: absolute; left: 12%; right: 12%; background: var(--accent); }
.colg.n2 .bar.s1 { left: 6%; right: 52%; } .colg.n2 .bar.s2 { left: 52%; right: 6%; background: var(--series-2); }
.bar.is-hold { background: var(--hold); } .bar.is-off { background: var(--bad); } .bar.is-on { background: var(--good); }
.bar.partial { background: repeating-linear-gradient(135deg, var(--accent) 0 3px, transparent 3px 6px); box-shadow: inset 0 0 0 1px var(--accent); }
.zero { position: absolute; left: 0; right: 0; height: 1px; background: var(--ink); }
.val { position: absolute; left: -12px; right: -12px; text-align: center; font: 400 11px/1.3 var(--mono); color: var(--ink-2); white-space: nowrap; }
.xaxis { display: flex; gap: 6px; }
.xaxis span { flex: 1 1 0; min-width: 0; text-align: center; font: 400 11px/1.3 var(--mono); color: var(--ink-2); overflow: hidden; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 13px; color: var(--ink-2); }
.legend span { display: inline-flex; gap: 6px; align-items: center; }
.sw { display: inline-block; width: 12px; height: 12px; background: var(--accent); }
.sw.s2 { background: var(--series-2); } .sw.hold { background: var(--hold); } .sw.off { background: var(--bad); }
.sw.partial { background: repeating-linear-gradient(135deg, var(--accent) 0 2px, transparent 2px 4px); box-shadow: inset 0 0 0 1px var(--accent); }
.multiples { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); border-top: 1px solid var(--line); border-left: 1px solid var(--line); }
.mini { padding: 14px 16px 12px; background: var(--raised); border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); display: grid; gap: 6px; }
.mini-head { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.mini h3 { font-size: 15px; font-weight: 500; }
.mini-last { font: 400 12px/1.3 var(--mono); color: var(--ink-2); white-space: nowrap; }
.mini .plot { height: 64px; gap: 3px; }
.xaxis.ends { justify-content: space-between; }
.xaxis.ends span { flex: none; font-size: 10px; }
.view-toggle { display: inline-flex; border: 1px solid var(--ink); justify-self: start; }
.vt { min-height: 32px; padding: 0 14px; border: 0; background: transparent; cursor: pointer; font-size: 13px; }
.vt[aria-pressed="true"] { background: var(--ink); color: var(--surface); }

/* Tables: sort, search, filter, status bars; on a phone, a fade and a cue say there is more to the right. */
.tbl-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.tbl-search { height: 36px; padding: 0 10px; border: 1px solid var(--line-2); background: var(--raised); min-width: 220px; }
select { height: 36px; border: 1px solid var(--line-2); background: var(--raised); padding: 0 8px; }
.tbl-count { font-size: 13px; color: var(--ink-2); }
.tbl-box { display: grid; gap: 6px; }
.tbl-frame { position: relative; }
.tbl-wrap { overflow-x: auto; border-top: 2px solid var(--ink); }
.tbl-box.is-over:not(.at-end) .tbl-frame::after { content: ""; position: absolute; top: 0; right: 0; bottom: 0; width: 56px; pointer-events: none; background: linear-gradient(to right, transparent, var(--surface)); }
.swipe-cue { display: none; gap: 6px; align-items: center; justify-self: end; font: 500 12px/1.4 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
.swipe-cue svg { width: 14px; height: 14px; }
.tbl-box.is-over:not(.at-end) .swipe-cue { display: inline-flex; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { text-align: left; font: 400 11px/1.4 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--ink-2); padding: 10px; border-bottom: 1px solid var(--line-2); white-space: nowrap; }
th button { all: unset; cursor: pointer; }
th[aria-sort="ascending"] button::after { content: " \2191"; }
th[aria-sort="descending"] button::after { content: " \2193"; }
td { padding: 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
td.change { white-space: nowrap; }
td.change svg { width: 10px; height: 10px; margin-right: 6px; }
tr.is-off td:first-child { box-shadow: inset 3px 0 0 var(--bad); }
tr.is-hold td:first-child { box-shadow: inset 3px 0 0 var(--hold); }
tr.is-on td:first-child { box-shadow: inset 3px 0 0 var(--good); }
.more { justify-self: start; }

/* Callouts: findings and flags, a status color with an icon and a word, never color alone. */
.callouts { display: grid; gap: 10px; }
.co { display: grid; grid-template-columns: 34px 1fr; gap: 14px; padding: 16px 18px; background: var(--raised); border: 1px solid var(--line); border-left: 4px solid var(--line-2); }
.co-icon { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--track); color: var(--ink-2); }
.co-icon svg { width: 14px; height: 14px; }
.co h3 { font-size: 17px; font-weight: 500; display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
.co p { margin-top: 4px; font-size: 16px; color: var(--ink-2); }
.co.on { border-left-color: var(--good); } .co.on .co-icon { background: var(--good-wash); color: var(--good-ink); }
.co.hold { border-left-color: var(--hold); background: color-mix(in srgb, var(--hold) 7%, var(--raised)); } .co.hold .co-icon { background: var(--hold-wash); color: var(--hold-ink); }
.co.off { border-left-color: var(--bad); background: color-mix(in srgb, var(--bad) 6%, var(--raised)); } .co.off .co-icon { background: var(--bad-wash); color: var(--bad-ink); }
.found .co { padding: 14px 16px; }
.found .co p { margin-top: 0; color: var(--ink); }

/* Notes: what someone said or wrote, with who said it. */
.notes { display: grid; gap: 14px; }
.nt { display: grid; grid-template-columns: 28px 1fr; gap: 12px; }
.nt-q { font-size: 44px; line-height: .9; color: var(--accent); font-weight: 500; }
.nt h3 { font-size: 16px; font-weight: 500; }
.nt p { margin-top: 2px; }
.nt-src { display: inline-block; margin-top: 6px; font: 400 11px/1.4 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-2); border-top: 1px solid var(--line-2); padding-top: 4px; }

/* Commitments: a pledge with the words as given, who owns it, when it is due, and its status as given. */
.pledges { display: grid; gap: 0; border-top: 2px solid var(--ink); }
.pl { display: grid; grid-template-columns: 40px 1fr; gap: 14px; padding: 18px 0; border-bottom: 1px dashed var(--line-2); }
.pl-mark { width: 30px; height: 30px; border: 2px solid var(--ink); display: grid; place-items: center; font: 500 13px/1 var(--mono); }
.pl.quiet .pl-mark { border-style: dashed; border-color: var(--line-2); color: var(--ink-2); }
.pl-words { font-size: 19px; line-height: 1.4; letter-spacing: -0.01em; }
.pl-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.tag { display: inline-flex; gap: 6px; align-items: center; padding: 3px 9px; border: 1px solid var(--line-2); font-size: 13px; background: var(--paper); }
.tag b { font: 500 11px/1.4 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-2); }
.pl-status { margin-top: 12px; padding: 10px 12px; background: var(--raised); border-left: 2px solid var(--line-2); font-size: 15px; }
.pl-status .chip { margin-right: 8px; }
.pl-fact { margin-top: 8px; font-size: 14px; color: var(--ink-2); }

/* Questions: a numbered prompt deck. The question is the card; Why Ask This opens the fact behind it. */
.deck { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 14px; }
.qc { position: relative; background: var(--paper); border: 1px solid var(--line); border-top: 6px solid var(--accent); padding: 18px 20px 14px; display: grid; gap: 10px; align-content: start; }
.qc-num { font: 500 13px/1 var(--mono); letter-spacing: .12em; color: var(--accent); }
.qc-tag { font: 400 11px/1.4 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--ink-2); }
.qc-ask { font-size: 19px; line-height: 1.38; letter-spacing: -0.01em; font-weight: 500; }
.why-toggle { all: unset; box-sizing: border-box; cursor: pointer; justify-self: start; display: inline-flex; gap: 6px; align-items: center; min-height: 30px; font-size: 13px; color: var(--accent); border-bottom: 1px dotted var(--accent); }
.why-toggle svg { width: 11px; height: 11px; transition: transform .15s; }
.why-toggle[aria-expanded="true"] svg { transform: rotate(180deg); }
.why { padding: 10px 12px; background: var(--accent-wash); font-size: 15px; }
.why b { display: block; font: 500 11px/1.4 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--accent); margin-bottom: 4px; }

/* Choices: options side by side, each a tile you can mark as the one you picked. */
.choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.ch { background: var(--raised); border: 2px solid var(--line); padding: 18px 18px 16px; display: flex; flex-direction: column; gap: 10px; }
.ch .pick { margin-top: auto; }
.ch.picked { border-color: var(--accent); background: var(--accent-wash); }
.ch-opt { font: 500 12px/1.4 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
.ch h3 { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; line-height: 1.2; }
.ch-big { font-size: 30px; font-weight: 500; letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
.ch-big-label { font-size: 14px; color: var(--ink-2); }
.ch-facts li { font-size: 14px; color: var(--ink-2); padding: 6px 0; border-top: 1px solid var(--line); }
.ch-open { position: relative; margin-top: 4px; padding: 12px 14px; background: var(--paper); border: 1px solid var(--line-2); font-size: 15px; }
.ch-open::before { content: ""; position: absolute; top: -7px; left: 18px; width: 12px; height: 12px; background: var(--paper); border-left: 1px solid var(--line-2); border-top: 1px solid var(--line-2); transform: rotate(45deg); }
.ch-open b { display: block; font: 500 11px/1.4 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 4px; }
.pick { justify-self: start; min-height: 34px; padding: 0 12px; border: 1px solid var(--accent); background: transparent; color: var(--accent); cursor: pointer; font-size: 13px; }
.pick[aria-pressed="true"] { background: var(--accent); color: var(--surface); }

/* Agenda: a run of show. Time on the left, a track down the middle, each block as tall as its minutes. */
.ros { background: var(--paper); border: 1px solid var(--line); }
.ros-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; align-items: baseline; padding: 14px 18px; border-bottom: 1px solid var(--line); }
.ros-head h3 { font-size: 17px; font-weight: 500; }
.ros-when { font-size: 14px; color: var(--ink-2); }
.ros-track { display: flex; height: 30px; margin: 14px 18px 4px; gap: 2px; }
.ros-seg { display: grid; place-items: center; background: var(--accent); color: var(--surface); font: 500 12px/1 var(--mono); min-width: 22px; }
.ros-seg:nth-child(even) { background: color-mix(in srgb, var(--accent) 62%, var(--paper)); color: var(--ink); }
.ros-list { padding: 10px 18px 16px; }
.ros-item { display: grid; grid-template-columns: 7.5rem 26px 1fr auto; gap: 0 14px; min-height: calc(var(--min, 5) * 6px + 56px); }
.ros-time { font: 500 13px/1.35 var(--mono); padding-top: 2px; }
.ros-time span { display: block; font-weight: 400; color: var(--ink-2); font-size: 12px; }
.ros-rail { position: relative; }
.ros-rail::before { content: ""; position: absolute; left: 12px; top: 22px; bottom: 0; width: 2px; background: var(--line-2); }
.ros-item:last-child .ros-rail::before { display: none; }
.ros-dot { position: relative; z-index: 1; width: 26px; height: 26px; border-radius: 50%; background: var(--accent); color: var(--surface); display: grid; place-items: center; font: 500 12px/1 var(--mono); }
.ros-body { padding: 2px 0 18px; }
.ros-body h4 { font-size: 17px; font-weight: 500; line-height: 1.3; }
.ros-body p { font-size: 15px; color: var(--ink-2); margin-top: 2px; }
.ros-min { font: 500 12px/1 var(--mono); padding: 5px 8px; background: var(--track); height: max-content; white-space: nowrap; }

/* Timeline and plain lists (kept for skills that use them). */
.items li { display: grid; grid-template-columns: auto 1fr; gap: 12px; padding: 14px 0; border-top: 1px solid var(--line); }
.items h3, .tl h3 { font-size: 17px; font-weight: 500; }
.items p, .tl p { color: var(--ink-2); margin-top: 2px; }
.tl li { display: grid; grid-template-columns: 140px 1fr auto; gap: 14px; padding: 14px 0; border-top: 1px solid var(--line); }
.tl-date { font: 400 13px/1.6 var(--mono); color: var(--accent); }

/* Drafts: an email looks like an email, a memo like a page. Placeholders are blanks to fill in. */
.draft { border: 1px solid var(--line-2); background: var(--raised); }
.draft-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.draft-meta { font-size: 13px; color: var(--ink-2); }
.draft-meta b { color: var(--ink); font-weight: 500; }
.draft-body { padding: 14px; white-space: pre-wrap; font-size: 16px; }
.draft-flag { padding: 8px 14px; font-size: 13px; background: var(--hold-wash); color: var(--hold-ink); }
.ph { background: var(--hold-wash); color: var(--hold-ink); border-bottom: 1px dashed var(--hold-ink); padding: 0 .2em; font-weight: 500; }
.memo { background: var(--paper); border: 1px solid var(--line-2); padding: 0 0 20px; }
.memo-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 22px; border-bottom: 3px double var(--line-2); flex-wrap: wrap; }
.memo-kind { font: 500 13px/1 var(--mono); letter-spacing: .3em; text-transform: uppercase; }
.memo-title { padding: 18px 22px 4px; font-size: 22px; font-weight: 500; letter-spacing: -0.01em; line-height: 1.25; }
.memo-to { padding: 0 22px 10px; font-size: 13px; color: var(--ink-2); border-bottom: 1px solid var(--line); }
.memo-part { padding: 12px 22px 0; }
.memo-part h4 { font: 500 12px/1.4 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
.memo-part p { margin-top: 2px; font-size: 16px; }
.memo-part ul { margin-top: 4px; }
.memo-part li { position: relative; padding-left: 16px; font-size: 16px; }
.memo-part li::before { content: ""; position: absolute; left: 2px; top: .7em; width: 6px; height: 6px; background: var(--accent); }

/* Check Before Sending: tick boxes that remember, and a count of what is left. */
.check-count { display: grid; gap: 6px; font-size: 14px; color: var(--ink-2); }
.check-count .pbar { margin: 0; height: 6px; }
.check li { display: grid; grid-template-columns: 24px 1fr; gap: 10px; padding: 12px 0; border-top: 1px solid var(--line); }
.check input { width: 18px; height: 18px; margin-top: 4px; accent-color: var(--accent); }
.check .src { display: block; color: var(--ink-2); font-size: 13px; }
.check li.done span { text-decoration: line-through; color: var(--ink-2); }
.prose p + p { margin-top: 10px; }
.end { padding-top: 32px; color: var(--ink-2); font-size: 14px; }
.end p + p { margin-top: 6px; }
.brand { font: 500 12px/1.4 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink); }

@media (max-width: 979px) {
  .found, .moves { grid-column: span 12; } .rail, .proof { grid-column: span 12; } .rail-in { position: static; }
}
@media (max-width: 639px) {
  body { font-size: 16px; }
  .page { padding: 0 16px 40px; }
  .moves { padding: 22px 18px 10px; }
  .row { padding: 36px 0; }
  .tl li { grid-template-columns: 1fr; gap: 4px; }
  .prog, .dl-row { grid-template-columns: 1fr; }
  .dl-text { grid-column: 1; }
  .hbar { grid-template-columns: minmax(0, 1fr) auto; } .hbar > .hbar-lab { grid-column: 1 / -1; }
  .val { display: none; }
  .ros-item { grid-template-columns: 5.6rem 26px 1fr; }
  .ros-min { grid-column: 3; justify-self: start; margin-bottom: 14px; }
  .callout { font-size: 19px; }
  .qc-ask { font-size: 18px; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
@media print {
  @page { size: letter; margin: .55in; }
  :root { --surface: #ffffff; --paper: #ffffff; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { zoom: .78; }
  .page { max-width: none; padding: 0; }
  .btn, .disc-toggle, .why-toggle, .view-toggle, .pick, .tbl-tools, .more, .toc, .swipe-cue { display: none !important; }
  .disc-body[hidden], .why[hidden], .pane[hidden], tr[hidden] { display: revert !important; }
  .disc-body[hidden], .why[hidden], .pane[hidden] { display: grid !important; }
  .tbl-wrap { overflow: visible; }
  .tbl-box .tbl-frame::after { display: none !important; }
  .rail-in { position: static; }
  /* A row may break between its items, never inside one, and its heading stays with what follows it. */
  .row, .summary, .proof, .found > ul { display: block; }
  .rail { margin-bottom: 16px; break-after: avoid; }
  .rail, .rail-in { break-inside: avoid; }
  .proof > :first-child { break-before: avoid; }
  .proof > * + *, .found li + li { margin-top: 14px; }
  .moves { margin-top: 20px; }
  .items li, .tl li, .draft, .check li, .tile, tr, .found li, .moves li, .decide, .co, .nt, .pl, .qc, .ch, .meter, .prog, .dl-row, .hbar-item, .ros-item, .mini, .chart, .callout, .memo-part, .math-body li { break-inside: avoid; }
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
  var uid = 0;
  function nextId(p) { return p + '-' + (++uid); }

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
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function plain(t) { return String(t == null ? '' : t).replace(/\*\*(.+?)\*\*/g, '$1'); }
  /* **words** in any sentence become a highlighted phrase. Still text nodes, never markup. */
  function rich(t) {
    if (t == null || t === '') return null;
    return String(t).split(/\*\*(.+?)\*\*/g).map(function (p, i) { return i % 2 ? h('strong.hl', p) : p; });
  }
  /* [Placeholders] in a draft become blanks to fill in. */
  function blanks(t) {
    return String(t || '').split(/(\[[^\]\n]{1,60}\])/g).map(function (p, i) { return i % 2 ? h('span.ph', p) : p; });
  }

  var PATHS = { on: 'M2.6 6.4 5 8.8 9.4 3.6', off: 'M3.2 3.2 8.8 8.8M8.8 3.2 3.2 8.8', hold: 'M2.5 6h7', quiet: 'M6 3v0M6 6v3', plus: 'M6 2v8M2 6h8', minus: 'M2 6h8',
    chev: 'M2.5 4.5 6 8 9.5 4.5', right: 'M1.5 6h8.5M7 3l3 3-3 3', quote: 'M3 4h2.5v3L4 9.5M6.5 4H9v3L7.5 9.5', note: 'M3 2.5h6v7H3zM4.5 5h3M4.5 7h3' };
  var SOLID = { up: 'M6 2.2 10.4 9.4H1.6z', down: 'M6 9.8 1.6 2.6h8.8z', flat: 'M1.5 4.5h9v3h-9z' };
  var WORD = { on: 'On', off: 'Off', hold: 'Watch', quiet: 'No Data' };
  function icon(name) {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 12 12'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    var p = document.createElementNS(SVG, 'path');
    if (SOLID[name]) { p.setAttribute('d', SOLID[name]); p.setAttribute('fill', 'currentColor'); }
    else {
      p.setAttribute('d', PATHS[name] || PATHS.quiet); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', '1.6'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    }
    s.appendChild(p); return s;
  }
  function chip(status, text) {
    if (!status) return null;
    return h('span.chip.' + status, icon(status), h('span', text || WORD[status] || status));
  }
  /* The status word alone, beside an icon that is already there. */
  function word(status, text) {
    if (!status) return null;
    return h('span.chip.' + status, text || WORD[status] || status);
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
  /* Show The Details: a button that opens and closes what sits under it. Print opens every one. */
  function disclose(label, body, open) {
    var id = nextId('disc');
    var wrap = h('div.disc-body', { id: id }, body);
    if (!open) wrap.setAttribute('hidden', 'hidden');
    var text = h('span', open ? label.replace(/^Show/, 'Hide') : label);
    var btn = h('button.disc-toggle', { type: 'button', 'aria-expanded': String(!!open), 'aria-controls': id }, icon('chev'), text);
    btn.addEventListener('click', function () {
      var opening = wrap.hasAttribute('hidden');
      if (opening) wrap.removeAttribute('hidden'); else wrap.setAttribute('hidden', 'hidden');
      btn.setAttribute('aria-expanded', String(opening));
      text.textContent = opening ? label.replace(/^Show/, 'Hide') : label;
      if (opening) refresh(wrap);
    });
    return h('div.disc', btn, wrap);
  }
  function math(lines, title) {
    if (typeof lines === 'string') lines = [lines];
    if (!lines || !lines.length) return null;
    return disclose('Show The Math', h('div.math-body', title ? h('p', title) : null, h('ul', lines.map(function (l) { return h('li', l); }))));
  }
  function copyText(text, btn, label) {
    function done() { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = label; }, 1800); }
    function failed() { btn.textContent = 'Select And Copy By Hand'; setTimeout(function () { btn.textContent = label; }, 3000); }
    try { navigator.clipboard.writeText(text).then(done, failed); } catch (e) { failed(); }
  }

  /* ----- numbers ----- */
  /* Whole dollars rounded half to even, as Python prints them, so a figure on the page matches the run's own file. */
  function whole(v) { var r = Math.round(v); return Math.abs(v % 1) === 0.5 ? 2 * Math.round(v / 2) : r; }
  function fmt(v, type) {
    if (v == null || v === '') return '';
    if (typeof v !== 'number') return String(v);
    if (type === 'usd') return (v < 0 ? '−$' : '$') + Math.abs(whole(v)).toLocaleString('en-US');
    if (type === 'usd2') return (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (type === 'pct') return (v < 0 ? '−' : '') + Math.abs(Math.round(v * 10) / 10).toFixed(1) + '%';
    if (type === 'num') return v.toLocaleString('en-US');
    return String(v);
  }
  function share(v, max) { return max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0; }
  /* A bar toward a goal: the track runs to the larger of the two, the line marks the goal. */
  function goalBar(value, goal, status) {
    var top = Math.max(value, goal);
    var bar = h('div.pbar' + (status ? '.' + status : ''), { 'aria-hidden': 'true' }, h('span.pbar-fill'), goal > 0 ? h('span.pbar-goal') : null);
    bar.firstChild.style.width = share(value, top) + '%';
    if (goal > 0) bar.lastChild.style.left = share(goal, top) + '%';
    return bar;
  }
  function deltaLine(d) {
    var dir = d.dir === 'up' || d.dir === 'down' ? d.dir : 'flat';
    return h('p.delta.' + dir, d.dir ? icon(dir) : icon('right'), h('span', rich(d.text || fmt(d.value, d.format))));
  }

  /* ----- top: lockup, data check, title, buttons, meta strip ----- */
  var owners = [];
  function summaryText() {
    var out = [D.report + (D.meta ? ': ' + D.meta.map(function (m) { return m.value; }).join(', ') : '')];
    if (D.sample) out.push(D.sample);
    if (D.dataCheck && D.dataCheck.length) { out.push('', 'Data Check'); D.dataCheck.forEach(function (t) { out.push('- ' + t); }); }
    out.push('', 'Bottom Line: ' + (D.headline || []).join(' '));
    if (D.keyNumbers && D.keyNumbers.length) {
      out.push('', 'Key Numbers');
      D.keyNumbers.forEach(function (k) { out.push('- ' + k.label + ': ' + k.value + (k.chip || k.status ? ' (' + (k.chip || WORD[k.status]) + ')' : '') + (k.means ? '. ' + plain(k.means) : '')); });
    }
    if (D.findings && D.findings.length) { out.push('', 'What We Found'); D.findings.forEach(function (f) { out.push('- ' + (f.chip || WORD[f.status] || '') + ': ' + plain(f.text)); }); }
    if (D.moves && D.moves.length) {
      out.push('', D.movesLabel || 'First Moves');
      D.moves.forEach(function (m, i) {
        var o = owners[i] && owners[i].value ? ' Owner: ' + owners[i].value + '.' : '';
        out.push((i + 1) + '. ' + m.title + (m.size ? ' (' + m.size + ')' : '') + ' ' + plain(m.text || '') + o);
      });
    }
    if (D.decide) out.push('', 'Decide: ' + plain(D.decide));
    picks.forEach(function (p) { if (p.get()) out.push('', p.label + ': ' + p.get()); });
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
  function tile(t, key) {
    return h('div.tile' + (key ? '.key' : ''),
      h('div.tile-head', h('p.label', t.label), chip(t.status, t.chip)),
      h('span.tile-num', t.value),
      t.bar ? goalBar(t.bar.value, t.bar.goal, t.status) : null,
      t.delta ? deltaLine(t.delta) : null,
      t.unit ? h('p.tile-unit', rich(t.unit)) : null,
      t.means ? h('p.tile-means', rich(t.means)) : null,
      t.note ? h('p.tile-note', rich(t.note)) : null);
  }
  function callout(f, tag) {
    var st = f.status || '';
    return h((tag || 'div') + '.co' + (st ? '.' + st : ''),
      h('span.co-icon', icon(f.icon || (st === 'quiet' || !st ? 'quiet' : st))),
      h('div', f.title ? h('h3', f.title, word(st, f.chip)) : (f.chip || st ? h('h3', word(st, f.chip)) : null), f.text ? h('p', rich(f.text)) : null));
  }
  /* ----- the bottom line: headline, key numbers, what we found, first moves with editable owners, decide ----- */
  function bottom() {
    var hasMoves = D.moves && D.moves.length;
    var hasFound = D.findings && D.findings.length;
    return h('section.bottom', { 'aria-label': 'Bottom Line' },
      h('p.eyebrow', 'Bottom Line'),
      h('h1.headline', (D.headline || []).map(function (l) { return h('span', l + ' '); })),
      D.keyNumbers && D.keyNumbers.length ? h('div.keys.tiles', { role: 'group', 'aria-label': 'Key Numbers' }, D.keyNumbers.map(function (k) { return tile(k, true); })) : null,
      hasFound || hasMoves || D.decide ? h('div.summary',
        hasFound ? h('div.found' + (hasMoves ? '' : '.wide'),
          h('h2.label', 'What We Found'),
          h('ul', D.findings.map(function (f) { return callout({ status: f.status, chip: f.chip, text: f.text }, 'li'); }))) : null,
        hasMoves ? h('div.moves',
          h('h2.label', D.movesLabel || 'First Moves'),
          h('ol', D.moves.map(function (m, i) {
            var id = 'owner-' + i;
            var input = h('input.owner-in', { id: id, type: 'text', value: m.owner || '', placeholder: 'Add an owner', autocomplete: 'off' });
            var saved = recall('owner-' + i); if (saved != null) input.value = saved;
            input.addEventListener('input', function () { store('owner-' + i, input.value); });
            owners[i] = input;
            return h('li', h('span.idx', { 'aria-hidden': 'true' }, pad(i + 1)), h('div',
              h('h3', m.title), m.text ? h('p', rich(m.text)) : null,
              h('div.act-meta', m.tag ? h('span', m.tag) : null, m.size ? h('span.act-usd', m.size) : null,
                h('label.act-owner', { 'for': id }, h('span', 'Owner'), input))));
          })),
          D.decide ? h('div.decide', h('span.label', 'Decide'), h('p', rich(D.decide))) : null) : null,
        !hasMoves && D.decide ? h('div.found.wide', h('h2.label', 'Decide'), h('blockquote.callout', rich(D.decide))) : null) : null);
  }

  /* ----- section kinds. Add a kind here once and every skill can use it. ----- */
  function tableView(s) {
    var cols = s.columns || [], rows = (s.rows || []).slice();
    var st = { q: '', f: {}, key: s.sort ? s.sort.key : null, dir: s.sort && s.sort.dir === 'asc' ? 1 : -1, all: false };
    var limit = s.limit || 25;
    var numeric = function (c) { return c.type === 'usd' || c.type === 'usd2' || c.type === 'num' || c.type === 'pct' || c.type === 'change'; };
    var tbody = h('tbody'), count = h('span.tbl-count', { role: 'status' }), more = h('button.btn.more', { type: 'button' }, 'Show All Rows');
    var heads = cols.map(function (c) {
      var th = h('th' + (numeric(c) ? '.num' : ''), { scope: 'col' });
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
    function cell(c, r) {
      var v = r[c.key];
      if (c.type === 'status') return h('td', chip(v, r._chip));
      if (c.type === 'change') {
        if (typeof v !== 'number') return h('td.num.change', v == null ? '' : String(v));
        var dir = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
        return h('td.num.change', icon(dir), h('span', (v > 0 ? 'up ' : v < 0 ? 'down ' : 'no change ') + (v === 0 ? '' : fmt(Math.abs(v), c.format || 'num'))));
      }
      return h('td' + (numeric(c) ? '.num' : ''), fmt(v, c.type));
    }
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
        var tr = h('tr' + (r._status ? '.is-' + r._status : ''), cols.map(function (c) { return cell(c, r); }));
        if (!st.all && i >= limit) tr.setAttribute('hidden', 'hidden');
        tbody.appendChild(tr);
      });
      count.textContent = shown.length === rows.length ? rows.length + ' rows' : shown.length + ' of ' + rows.length + ' rows';
      more.style.display = !st.all && shown.length > limit ? '' : 'none';
    }
    draw();
    var wrap = h('div.tbl-wrap', { tabindex: '0', role: 'region', 'aria-label': (s.label || 'Table') + ', scrolls sideways' },
      h('table', s.caption ? h('caption.label', { style: 'text-align:left;padding:8px 0' }, s.caption) : null, h('thead', h('tr', heads)), tbody));
    var box = h('div.tbl-box', h('div.tbl-frame', wrap), h('p.swipe-cue', { 'aria-hidden': 'true' }, h('span', 'Swipe to see more'), icon('right')));
    wrap.addEventListener('scroll', function () { scrollState(box); }, { passive: true });
    return [tools.length ? h('div.tbl-tools', tools, count) : null, box, more];
  }
  function scrollState(box) {
    var w = box.querySelector('.tbl-wrap'); if (!w) return;
    box.classList.toggle('is-over', w.scrollWidth > w.clientWidth + 2);
    box.classList.toggle('at-end', w.scrollLeft + w.clientWidth >= w.scrollWidth - 2);
  }
  function short(label) { var m = /^([A-Za-z]{3})[A-Za-z]* \d{4}/.exec(String(label)); return m ? m[1] : String(label); }
  /* Columns over the table's rows. A row's status colors its bars; a partial row is hatched. */
  function columns(rows, c, series, small) {
    var vals = [];
    rows.forEach(function (r) { series.forEach(function (se) { var v = r[se.key]; if (typeof v === 'number') vals.push(v); }); });
    var max = Math.max.apply(null, [0].concat(vals)), min = Math.min.apply(null, [0].concat(vals)), span = (max - min) || 1;
    var zero = -min / span * 100;
    var plot = h('div.plot', { 'aria-hidden': 'true' });
    rows.forEach(function (r) {
      var g = h('div.colg' + (series.length > 1 ? '.n2' : ''));
      series.forEach(function (se, i) {
        var v = r[se.key]; if (typeof v !== 'number') return;
        var b = h('span.bar.s' + (i + 1) + (r._partial ? '.partial' : '') + (r._status && series.length === 1 ? '.is-' + r._status : ''),
          { title: r[c.x] + ': ' + se.label + ' ' + fmt(v, se.format || c.format) });
        b.style.height = Math.abs(v) / span * 100 + '%';
        if (v >= 0) b.style.bottom = zero + '%'; else b.style.top = (100 - zero) + '%';
        g.appendChild(b);
        if (!small && series.length === 1 && c.values !== false) {
          var lab = h('span.val', fmt(v, se.format || c.format));
          /* Above the bar; for a negative bar, just above the zero line, so it never meets the month labels. */
          lab.style.bottom = 'calc(' + (v >= 0 ? zero + Math.abs(v) / span * 100 : zero) + '% + 2px)';
          g.appendChild(lab);
        }
      });
      plot.appendChild(g);
    });
    var z = h('span.zero'); z.style.bottom = zero + '%'; plot.appendChild(z);
    var axis = small && rows.length ? h('div.xaxis.ends', { 'aria-hidden': 'true' }, h('span', short(rows[0][c.x])), h('span', short(rows[rows.length - 1][c.x])))
      : h('div.xaxis', { 'aria-hidden': 'true' }, rows.map(function (r) { return h('span', short(r[c.x])); }));
    return [plot, axis];
  }
  function chartView(s) {
    var c = s.chart, rows = s.rows || [];
    var colType = function (k) { var col = (s.columns || []).filter(function (x) { return x.key === k; })[0]; return col ? col.type : 'num'; };
    var series = (c.series || []).map(function (se) { return { key: se.key, label: se.label, format: se.format || colType(se.key) }; });
    var says = (c.label || s.label) + '. Every value is in the table under Table.';
    var legend = [];
    if (c.type !== 'multiples' && series.length > 1) series.forEach(function (se, i) { legend.push(h('span', h('i.sw' + (i ? '.s2' : '')), se.label)); });
    (c.legend || []).forEach(function (l) { legend.push(h('span', h('i.sw.' + (l.status || 'partial')), l.label)); });
    if (c.type === 'multiples') {
      return h('figure.chart', { role: 'img', 'aria-label': says },
        h('div.multiples', series.map(function (se) {
          var last = rows.filter(function (r) { return !r._partial && typeof r[se.key] === 'number'; }).slice(-1)[0];
          return h('div.mini', h('div.mini-head', h('h3', se.label), last ? h('span.mini-last', short(last[c.x]) + ': ' + fmt(last[se.key], se.format)) : null),
            columns(rows, c, [se], true));
        })),
        legend.length ? h('div.legend', legend) : null);
    }
    return h('figure.chart', { role: 'img', 'aria-label': says }, columns(rows, c, series, false), legend.length ? h('div.legend', legend) : null);
  }
  function tableKind(s) {
    if (!s.chart) return tableView(s);
    var chartPane = h('div.pane', chartView(s));
    var tablePane = h('div.pane', { hidden: 'hidden' }, tableView(s));
    var bChart = h('button.vt', { type: 'button', 'aria-pressed': 'true' }, 'Chart');
    var bTable = h('button.vt', { type: 'button', 'aria-pressed': 'false' }, 'Table');
    function show(chartOn) {
      if (chartOn) { chartPane.removeAttribute('hidden'); tablePane.setAttribute('hidden', 'hidden'); }
      else { tablePane.removeAttribute('hidden'); chartPane.setAttribute('hidden', 'hidden'); refresh(tablePane); }
      bChart.setAttribute('aria-pressed', String(chartOn)); bTable.setAttribute('aria-pressed', String(!chartOn));
    }
    bChart.addEventListener('click', function () { show(true); });
    bTable.addEventListener('click', function () { show(false); });
    return [h('div.view-toggle', { role: 'group', 'aria-label': 'Show ' + s.label + ' as' }, bChart, bTable), chartPane, tablePane];
  }
  function tilesView(s) { return h('div.tiles', (s.tiles || []).map(function (t) { return tile(t); })); }
  function listView(s) {
    return h('ul.items', (s.items || []).map(function (it) {
      return h('li', it.status ? chip(it.status, it.chip) : h('span'), h('div', it.title ? h('h3', it.title) : null, it.text ? h('p', rich(it.text)) : null, math(it.math)));
    }));
  }
  function timelineView(s) {
    return h('ol.tl', (s.items || []).map(function (it) {
      return h('li', h('span.tl-date', it.date || ''), h('div', h('h3', it.title), it.text ? h('p', rich(it.text)) : null), chip(it.status, it.chip));
    }));
  }
  /* More than `show` items: the first ones stay open, the rest wait behind Show All. */
  function firstFew(s, items, render, wrapSpec, noun) {
    var n = s.show || items.length;
    var shown = h(wrapSpec, items.slice(0, n).map(render));
    if (items.length <= n) return shown;
    return [shown, disclose('Show All ' + items.length + ' ' + (noun || 'Items'), h(wrapSpec, items.slice(n).map(function (it, i) { return render(it, i + n); })))];
  }
  function calloutsView(s) {
    return firstFew(s, s.items || [], function (it) { return callout(it); }, 'div.callouts', s.noun);
  }
  function notesView(s) {
    return h('div.notes', (s.items || []).map(function (it) {
      return h('figure.nt', h('span.nt-q', { 'aria-hidden': 'true' }, '“'),
        h('div', it.title ? h('h3', it.title) : null, h('p', rich(it.text)), it.source ? h('figcaption.nt-src', it.source) : null));
    }));
  }
  function pledgesView(s) {
    return h('ol.pledges', (s.items || []).map(function (it, i) {
      return h('li.pl' + (it.status ? '.' + it.status : ''),
        h('span.pl-mark', { 'aria-hidden': 'true' }, it.status === 'quiet' ? '?' : String(i + 1)),
        h('div',
          it.title ? h('p.label', it.title) : null,
          h('p.pl-words', '“' + it.words + '”'),
          it.owner || it.due ? h('div.pl-chips', it.owner ? h('span.tag', h('b', 'Owner'), it.owner) : null, it.due ? h('span.tag', h('b', 'Due'), it.due) : null) : null,
          h('p.pl-status', chip(it.status, it.chip), h('span', rich(it.statusText || 'No status given.'))),
          it.fact ? h('p.pl-fact', rich(it.fact)) : null));
    }));
  }
  function questionsView(s) {
    function card(it, i) {
      var why = null, btn = null;
      if (it.why) {
        var id = nextId('why');
        why = h('div.why', { id: id, hidden: 'hidden' }, h('b', it.whyLabel || 'Why Ask This'), rich(it.why));
        btn = h('button.why-toggle', { type: 'button', 'aria-expanded': 'false', 'aria-controls': id }, icon('chev'), h('span', it.whyLabel || 'Why Ask This'));
        btn.addEventListener('click', function () {
          var opening = why.hasAttribute('hidden');
          if (opening) why.removeAttribute('hidden'); else why.setAttribute('hidden', 'hidden');
          btn.setAttribute('aria-expanded', String(opening));
        });
      }
      return h('article.qc', h('p.qc-num', pad(i + 1) + (it.tag ? '' : '')), it.tag ? h('p.qc-tag', it.tag) : null, h('p.qc-ask', it.ask), btn, why);
    }
    return firstFew(s, s.items || [], card, 'div.deck', s.noun || 'Questions');
  }
  var picks = [];
  function choicesView(s) {
    var key = 'pick-' + (s.id || 'choices');
    var tiles = [], buttons = [];
    var saved = recall(key);
    function set(idx) {
      tiles.forEach(function (t, i) { t.classList.toggle('picked', i === idx); buttons[i].setAttribute('aria-pressed', String(i === idx)); buttons[i].textContent = i === idx ? 'Picked' : 'Pick This One'; });
      store(key, idx == null ? null : String(idx));
    }
    var items = s.items || [];
    items.forEach(function (it, i) {
      var b = s.pickable === false ? null : h('button.pick', { type: 'button', 'aria-pressed': 'false' }, 'Pick This One');
      if (b) b.addEventListener('click', function () { set(b.getAttribute('aria-pressed') === 'true' ? null : i); });
      buttons.push(b);
      tiles.push(h('article.ch',
        h('p.ch-opt', it.option || 'Option ' + (i + 1)),
        h('h3', it.title),
        it.big ? h('div', h('p.ch-big', it.big), it.bigLabel ? h('p.ch-big-label', it.bigLabel) : null) : null,
        it.bar ? goalBar(it.bar.value, it.bar.goal, it.status) : null,
        it.facts && it.facts.length ? h('ul.ch-facts', it.facts.map(function (f) { return h('li', rich(f)); })) : null,
        it.open ? h('div.ch-open', h('b', it.openLabel || 'To Open It'), rich(it.open)) : null,
        b));
    });
    if (s.pickable !== false) {
      picks.push({ label: s.pickLabel || 'Picked', get: function () { var v = recall(key); return v == null || !items[+v] ? '' : items[+v].title; } });
      if (saved != null && items[+saved]) set(+saved);
    }
    return h('div.choices', tiles);
  }
  function agendaView(s) {
    var items = s.items || [];
    var total = 0; items.forEach(function (it) { total += +it.minutes || 0; });
    var track = h('div.ros-track', { 'aria-hidden': 'true' }, items.map(function (it, i) {
      var seg = h('span.ros-seg', { title: it.title + ', ' + it.minutes + ' minutes' }, String(i + 1));
      seg.style.flex = (+it.minutes || 1) + ' 1 0'; return seg;
    }));
    return h('div.ros', { role: 'group', 'aria-label': s.label },
      h('div.ros-head', h('h3', s.agendaTitle || 'Run Of Show'), s.when ? h('span.ros-when', s.when) : null),
      track,
      h('ol.ros-list', items.map(function (it, i) {
        var times = String(it.time || '').split(' / ');
        var row = h('li.ros-item',
          h('p.ros-time', times[0], times[1] ? h('span', times[1]) : null),
          h('div.ros-rail', h('span.ros-dot', { 'aria-hidden': 'true' }, String(i + 1))),
          h('div.ros-body', h('h4', it.title), it.text ? h('p', rich(it.text)) : null),
          it.minutes ? h('span.ros-min', it.minutes + ' min') : null);
        row.style.setProperty('--min', Math.min(+it.minutes || 5, 20));
        return row;
      })));
  }
  function progressView(s) {
    return [s.goalLegend ? h('p.legend-line', h('i'), h('span', s.goalLegend)) : null,
      h('div.progress', (s.items || []).map(function (it) {
        return h('div.prog',
          h('div', h('h3', it.label), chip(it.status, it.chip)),
          h('div', typeof it.goal === 'number' ? goalBar(it.value, it.goal, it.status) : null,
            h('p.prog-nums', h('b', it.valueText || fmt(it.value, 'num')), it.goalText ? h('span', it.goalText) : null, it.pctText ? h('span', it.pctText) : null),
            it.text ? h('p.prog-text', rich(it.text)) : null, math(it.math)));
      }))];
  }
  function metersView(s) {
    return h('div.meters', (s.items || []).map(function (it) {
      var track = h('div.meter-track', { 'aria-hidden': 'true' }, h('span.meter-fill'));
      track.firstChild.style.width = share(it.value, 100) + '%';
      if (typeof it.target === 'number') { var m = h('span.meter-mark'); m.style.left = share(it.target, 100) + '%'; track.appendChild(m); }
      return h('div.meter' + (it.status ? '.' + it.status : ''),
        h('div.tile-head', h('h3', it.label), chip(it.status, it.chip)),
        h('p.meter-big', it.valueText || fmt(it.value, 'pct')),
        track, h('div.meter-scale', { 'aria-hidden': 'true' }, h('span', '0%'), h('span', '100%')),
        it.targetText ? (typeof it.target === 'number' ? h('p.meter-text', h('span.legend-line', h('i'), h('span', it.targetText))) : h('p.meter-text', it.targetText)) : null,
        it.text ? h('p.meter-text', rich(it.text)) : null);
    }));
  }
  function barsView(s) {
    var items = s.items || [];
    var all = []; items.forEach(function (it) { (it.bars || []).forEach(function (b) { all.push(b.value); }); });
    var shared = Math.max.apply(null, [0].concat(all));
    var pairs = items.length > 2 && items.every(function (it) { return (it.bars || []).length > 1; });
    return h('div.hbars' + (pairs ? '.pairs' : ''), items.map(function (it) {
      var bars = it.bars || [];
      var top = s.scale === 'item' ? Math.max.apply(null, [0].concat(bars.map(function (b) { return b.value; }))) : shared;
      var solo = bars.length === 1 && !bars[0].label;
      return h('div.hbar-item', h('h3', it.label), it.text ? h('p', rich(it.text)) : null,
        bars.map(function (b, i) {
          var fill = h('span.hbar-fill' + (i ? '.b2' : '') + (b.status ? '.' + b.status : ''));
          fill.style.width = share(b.value, top) + '%';
          return h('div.hbar' + (solo ? '.solo' : ''), solo ? null : h('span.hbar-lab', b.label),
            h('span.hbar-track', { 'aria-hidden': 'true' }, fill), h('span.hbar-val', b.text || fmt(b.value, s.format)));
        }));
    }));
  }
  function deltasView(s) {
    return h('div.deltas', (s.items || []).map(function (it) {
      var dir = it.dir === 'up' || it.dir === 'down' || it.dir === 'flat' ? it.dir : '';
      return h('div.dl-row',
        h('h3', it.label),
        h('p.dl-move', it.from != null ? h('span.from', it.fromLabel ? it.fromLabel + ' ' + it.from : it.from) : null, it.from != null ? icon('right') : null,
          h('span.to', it.toLabel ? it.toLabel + ' ' + it.to : it.to)),
        it.change ? h('span.dl-change', dir ? icon(dir) : null, h('span', it.change)) : h('span'),
        it.text ? h('p.dl-text', rich(it.text)) : null);
    }));
  }
  function memoView(d) {
    var parts = [], cur = null;
    String(d.body || '').split('\n').forEach(function (line) {
      var m = /^([A-Z][A-Za-z&' ]{1,40}):\s*(.*)$/.exec(line);
      if (m) { cur = { head: m[1], lines: m[2] ? [m[2]] : [], bullets: [] }; parts.push(cur); }
      else if (/^- /.test(line) && cur) cur.bullets.push(line.slice(2));
      else if (line.trim() && cur) cur.lines.push(line);
      else if (line.trim()) { cur = { head: '', lines: [line], bullets: [] }; parts.push(cur); }
    });
    return parts.map(function (p) {
      return h('div.memo-part', p.head ? h('h4', p.head) : null, p.lines.map(function (l) { return h('p', blanks(l)); }),
        p.bullets.length ? h('ul', p.bullets.map(function (b) { return h('li', blanks(b)); })) : null);
    });
  }
  function draftsView(s) {
    return (s.drafts || []).map(function (d) {
      var btn = h('button.btn', { type: 'button' }, 'Copy Draft');
      var text = (d.subject ? 'Subject: ' + d.subject + '\n\n' : '') + (d.body || '');
      btn.addEventListener('click', function () { copyText(text, btn, 'Copy Draft'); });
      if (d.style === 'memo') {
        return h('article.memo',
          h('div.memo-top', h('span.memo-kind', d.label || 'Memo'), btn),
          d.subject ? h('h3.memo-title', d.subject) : null,
          h('p.memo-to', d.to ? 'For: ' + d.to : null, d.channel ? (d.to ? ' · ' : '') + d.channel : null),
          memoView(d),
          d.flag ? h('p.draft-flag', { style: 'margin-top:14px' }, d.flag) : null);
      }
      return h('article.draft',
        h('div.draft-head', h('div.draft-meta', h('b', d.label || 'Draft'), d.to ? ' · To: ' + d.to : '', d.channel ? ' · ' + d.channel : ''), btn),
        d.subject ? h('div.draft-meta', { style: 'padding:10px 14px 0' }, h('b', 'Subject: '), d.subject) : null,
        h('div.draft-body', blanks(d.body)),
        d.flag ? h('p.draft-flag', d.flag) : null);
    });
  }
  function checklistView(s) {
    var items = s.items || [];
    var countText = h('span'), bar = h('div.pbar', { 'aria-hidden': 'true' }, h('span.pbar-fill'));
    var boxes = [];
    function tally() {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      countText.textContent = n + ' of ' + items.length + ' checked';
      bar.firstChild.style.width = share(n, items.length) + '%';
    }
    var list = h('ul.check', items.map(function (it, i) {
      var id = (s.id || 'check') + '-' + i;
      var box = h('input', { type: 'checkbox', id: id }); boxes.push(box);
      var li = h('li', box, h('label', { 'for': id }, h('span', rich(it.text)), it.source ? h('span.src', 'Check against: ' + it.source) : null));
      if (recall(id) === '1') { box.checked = true; li.classList.add('done'); }
      box.addEventListener('change', function () { store(id, box.checked ? '1' : null); li.classList.toggle('done', box.checked); tally(); });
      return li;
    }));
    tally();
    return [h('div.check-count', { 'aria-live': 'polite' }, countText, bar), list];
  }
  function proseView(s) { return h('div.prose', (s.paragraphs || []).map(function (p) { return h('p', rich(p)); })); }
  var KINDS = { table: tableKind, tiles: tilesView, list: listView, timeline: timelineView, drafts: draftsView, checklist: checklistView, prose: proseView,
    progress: progressView, meters: metersView, bars: barsView, deltas: deltasView, callouts: calloutsView, notes: notesView,
    commitments: pledgesView, questions: questionsView, choices: choicesView, agenda: agendaView };
  function section(s, i) {
    var view = KINDS[s.kind]; if (!view) return null;
    var body = view(s);
    var c = s.callout;
    return h('section.row', { id: 's-' + (s.id || i), 'aria-label': s.label },
      h('div.rail', h('div.rail-in', h('p.eyebrow', h('span.sec-num', pad(i + 1)), s.label), s.finding ? h('h2', rich(s.finding)) : null,
        s.note ? h('p.note', rich(s.note)) : null, s.flag ? chip(s.flag.status, s.flag.text) : null)),
      h('div.proof',
        c ? h('blockquote.callout' + (c.status ? '.' + c.status : ''), c.status ? chip(c.status, c.chip) : null, h('p', rich(c.text || c))) : null,
        s.collapsed ? disclose(s.collapsedLabel || 'Show The Details', body) : body,
        s.detail ? disclose(s.detail.label || 'Show The Table', tableView(Object.assign({}, s.detail, { label: s.label + ', Full Table' }))) : null,
        math(s.math, s.mathTitle)));
  }
  function end() {
    return [h('div.end', h('p.brand', D.stamp || D.report), D.closing ? h('p', D.closing) : null, D.sample ? h('p', D.sample) : null,
      h('p', 'Nothing you do on this page changes your numbers or sends anything. Names you type, boxes you tick and options you pick stay in this browser only.')),
      lockup('div.lockup.lockup-end')];
  }
  /* One section that cannot be drawn says so in place; every other section still draws. */
  function safeSection(s, i) {
    try { return section(s, i); } catch (e) {
      if (window.console) console.error('Section "' + (s && (s.label || s.id)) + '" could not be drawn: ' + e.message);
      return h('section.row', { id: 's-' + ((s && s.id) || i), 'aria-label': (s && s.label) || 'Section' },
        h('div.rail', h('div.rail-in', h('p.eyebrow', h('span.sec-num', pad(i + 1)), (s && s.label) || ''))),
        h('div.proof', h('p.draw-error', { role: 'alert' }, 'This part of the page could not be drawn. Ask for the page to be built again.')));
    }
  }
  put(root, [top(), toc(), bottom(), (D.sections || []).map(safeSection), end()]);

  /* A long figure ("$8,841,500") steps its tile number down until it fits its tile, never below 22px. */
  function fitTiles(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll('.tile-num'), function (n) {
      n.style.fontSize = '';
      if (!n.offsetParent) return;
      var size = parseFloat(getComputedStyle(n).fontSize);
      while (n.scrollWidth > n.parentNode.clientWidth - 36 && size > 22) { size -= 2; n.style.fontSize = size + 'px'; }
    });
  }
  function refresh(scope) {
    fitTiles(scope);
    Array.prototype.forEach.call((scope || document).querySelectorAll('.tbl-box'), scrollState);
  }
  refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { refresh(); });
  window.addEventListener('resize', function () { refresh(); });
})();
</script>
</body>
</html>
~~~~~~
