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
