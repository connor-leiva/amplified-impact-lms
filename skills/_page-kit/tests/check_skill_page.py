#!/usr/bin/env python3
"""The page checks for one converted skill's sample page (HTML-BRIEF.md, Part 2 step 8 and Part 3).

    python3 skills/_page-kit/tests/check_skill_page.py skills/<name>

Reads skills/<name>/evals/page/build.json:
    page, words     the sample page.json and words.json (paths from the skill folder)
    facts, inputs   what every number must trace to: the run's JSON, and the practice files and prompt
    out             the HTML to write, under evals/page/
    order           the section ids in the order of the skill's "Output, In This Order"
    never           strings that must appear nowhere on the page (left-out details, other people)
    neverColumns    optional: {CSV file: [column, ...]}, every value in those columns joins `never`
                    (client names, addresses, agents' names)
    dataCheck       optional: how many Data Check warnings the case should raise (default 0)

Builds the page with the kit's own build_page.py (the copy every converted skill ships), then checks:
  1. the build passed and printed no STOPPED, CHECK or NOTE line, and a DATA CHECK line only when the
     case expects one, with exactly the expected number of warnings
  2. every number anywhere on the page traces to the facts or the inputs, not only the words
     (the merged page is checked again with --check-only and no --words, so the model's page.json
     is held to the same rule as its words.json)
  3. it opens offline: one file, no http or https in any src or href, no @import, no linked file
  4. the sections are the skill's, in its order, and Check Before Sending is the last one
  5. no email address, phone number, or account, card or routing number on the page
  6. none of the case's left-out strings on the page
  7. marked as a sample with made-up data
Writes the HTML and prints one PASS or FAIL line per check. Exit 1 on any FAIL.
"""
import csv
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(KIT, "scripts", "build_page.py")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[A-Za-z]{2,}")
PHONE = re.compile(r"(?<!\d)(?:\(\d{3}\)\s?|\d{3}[-. ])\d{3}[-. ]\d{4}(?!\d)")
# A bank, card or routing number: named as one ("account number 1234", "routing #", "card no."), or a bare run
# of nine or more digits. A chart-of-accounts code ("6010 Online Lead Programs") is not one.
ACCOUNT = re.compile(r"(?i)\b(account|acct|routing|card|aba)\s*(number|num|no\.?|#)\s*[:#]?\s*\d{4,}|(?<![\d,.$])\d{9,}(?![\d,])")


def main():
    skill = os.path.abspath(sys.argv[1])
    cfg = json.load(open(os.path.join(skill, "evals", "page", "build.json"), encoding="utf-8"))
    at = lambda rel: os.path.join(skill, rel)
    results = []

    def case(name, ok, detail=""):
        results.append(ok)
        print(("PASS " if ok else "FAIL ") + name + ("" if ok or not detail else "\n     " + detail[:600]))

    facts = sum((["--facts", at(f)] for f in cfg["facts"]), [])
    inputs = ["--inputs"] + [at(f) for f in cfg["inputs"]]
    out = at(cfg["out"])
    cmd = [sys.executable, BUILD, at(cfg["page"]), "--words", at(cfg["words"])] + facts + inputs + ["--out", out]
    p = subprocess.run(cmd, capture_output=True, text=True)
    log = p.stdout + p.stderr
    print(log.rstrip())
    print()
    want = cfg.get("dataCheck", 0)
    expected = "DATA CHECK: %d warning(s)" % want
    noisy = [l for l in log.splitlines() if re.match(r"\s*(BUILD STOPPED|CHECK|DATA CHECK|NOTE)", l)
             and not (want and l.startswith(expected))]
    seen = len(json.load(open(at(cfg["page"]), encoding="utf-8")).get("dataCheck") or [])
    case("the page builds with no STOPPED, CHECK or NOTE line (Data Check warnings: %d, expected %d)" % (seen, want),
         p.returncode == 0 and not noisy and seen == want, "\n".join(noisy) or log)
    if p.returncode:
        sys.exit(1)

    # 2. the whole page, words merged in, traced with no --words
    spec = importlib.util.spec_from_file_location("build_page", BUILD)
    bp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bp)
    page = json.load(open(at(cfg["page"]), encoding="utf-8"))
    problems = []
    bp.apply_words(page, json.load(open(at(cfg["words"]), encoding="utf-8")), problems)
    tmp = os.path.join(tempfile.mkdtemp(), "merged.json")
    json.dump(page, open(tmp, "w", encoding="utf-8"), ensure_ascii=False)
    t = subprocess.run([sys.executable, BUILD, tmp, "--check-only"] + facts + inputs, capture_output=True, text=True)
    case("every number on the page traces to the facts or the inputs", t.returncode == 0 and not problems, t.stdout + t.stderr)

    html = open(out, encoding="utf-8").read()
    data = html.split('id="page-data">', 1)[1].split("</script>", 1)[0]
    case("one file that opens offline (no http in any src or href, no @import, no linked file)",
         not re.search(r"""(src|href)\s*=\s*["']?https?:""", html, re.I) and "@import" not in html
         and not re.search(r"<link\b|<script[^>]+\bsrc=", html, re.I))

    ids = [s.get("id") for s in page.get("sections") or []]
    kinds = [s.get("kind") for s in page.get("sections") or []]
    case("the sections are the skill's, in its order, with Check Before Sending last",
         ids == cfg["order"] and kinds[-1:] == ["checklist"] and page["sections"][-1].get("label") == "Check Before Sending",
         "page: %s\nwant: %s" % (ids, cfg["order"]))

    text = "\n".join(s for _, s in bp.texts(page))
    hits = EMAIL.findall(text) + PHONE.findall(text) + [m.group(0) for m in ACCOUNT.finditer(text)]
    case("no email address, phone number, or account, card or routing number", not hits, ", ".join(map(str, hits)))

    banned = list(cfg.get("never", []))
    for rel, cols in (cfg.get("neverColumns") or {}).items():
        rows = list(csv.reader(open(at(rel), encoding="utf-8", newline="")))
        head = next(i for i, r in enumerate(rows) if all(c in r for c in cols))
        idx = [rows[head].index(c) for c in cols]
        banned += sorted({r[i].strip() for r in rows[head + 1:] for i in idx if i < len(r) and r[i].strip()})
    never = [s for s in banned if s.lower() in data.lower() or s.lower() in text.lower()]
    case("none of the %d left-out strings appear" % len(banned), not never, ", ".join(never))
    case("marked as a sample with made-up data", bool(page.get("sample")))

    print("\n%d of %d passed. %s (%d KB)" % (sum(results), len(results), os.path.relpath(out, skill),
                                              round(len(html.encode("utf-8")) / 1024)))
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
