# Page Kit (for building the report page)

Use this file only when the instructions say to build the page. In code (Python), save the first block
below as build_page.py and the second as base-template.html, in the same folder, exactly as written.
Do not change either file. Then run:

    python build_page.py page.json --words words.json --facts facts.json --template base-template.html --fonts none --out <File-Name>.html

and give the person the download link for the .html file right away. The link stops working when the
code session ends, so tell them to download it now. If the link fails, run the code again for a new link.

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
~~~~~~
