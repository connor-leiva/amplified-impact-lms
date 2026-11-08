"""Objective checks for one due-diligence-review output.

Usage:
  python3 -I check_output.py OUTPUT.md --inputs FILE [FILE ...] [--prompt TEXT] [--forbid TEXT ...]

Checks: no em or en dashes; a Check before sending section; a Title Case subject line; the buyer email's word
count (under 300); none of the banned stock phrases; none of the --forbid strings (account numbers and the like);
no long digit runs that look like account or loan numbers; and every number in the output, listed with whether it
appears in the inputs (PDFs read with pdftotext) or the prompt. Numbers not found are printed for the grader to
trace by hand: most are dates written another way, counts, or day math, which grading.md explains.
"""
import argparse
import re
import subprocess
import sys

BANNED = ["stunning", "dream home", "don't hesitate to reach out", "do not hesitate to reach out"]
SMALL_OK = set()  # house style capitalizes every word in a subject line


def pdf_text(path):
    if path.lower().endswith(".pdf"):
        return subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True).stdout
    with open(path, encoding="utf-8", errors="ignore") as fh:
        return fh.read()


def norm_numbers(text):
    out = set()
    for m in re.finditer(r"\$?\d[\d,]*(?:\.\d+)?%?", text):
        raw = m.group(0)
        core = raw.replace("$", "").replace(",", "").rstrip("%")
        if core.endswith("."):
            core = core[:-1]
        if core:
            out.add(core.lstrip("0") or "0")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("output")
    ap.add_argument("--inputs", nargs="+", default=[])
    ap.add_argument("--prompt", default="")
    ap.add_argument("--forbid", nargs="*", default=[])
    a = ap.parse_args()

    out = open(a.output, encoding="utf-8").read()
    src = a.prompt + "\n" + "\n".join(pdf_text(p) for p in a.inputs)
    ok = True

    dashes = [m.start() for m in re.finditer("[\\u2013\\u2014]", out)]
    print(f"em/en dashes: {len(dashes)}")
    ok &= not dashes

    has_check = re.search(r"^#+\s*Check Before Sending", out, re.M | re.I) is not None
    print(f"Check before sending section: {has_check}")
    ok &= has_check

    subj = re.findall(r"\*\*Subject:\*\*\s*(.+)", out)
    for s in subj:
        words = re.findall(r"[A-Za-z][A-Za-z']*", s)
        bad = [w for w in words if not w[0].isupper() and w not in SMALL_OK]
        print(f"subject: {s.strip()} | Title Case: {not bad} {bad if bad else ''}")
        ok &= not bad
    if not subj:
        print("subject: none found")
        ok = False

    m = re.search(r"^## Buyer Email\s*$(.*?)^## ", out, re.M | re.S)
    if m:
        body = m.group(1)
        body = re.sub(r"\*\*Subject:\*\*.*", "", body)
        words = len(re.findall(r"[A-Za-z0-9$][A-Za-z0-9$,.'%:/]*", body))
        print(f"buyer email words (after the subject line): {words}")
        ok &= words < 300
    else:
        print("buyer email: section not found")
        ok = False

    low = out.lower()
    hits = [b for b in BANNED if b in low]
    print(f"banned phrases: {hits}")
    ok &= not hits

    for fstr in a.forbid:
        found = fstr in out
        print(f"forbidden string {fstr!r} present: {found}")
        ok &= not found

    longruns = re.findall(r"\b\d{7,}\b", out.replace(",", ""))
    print(f"long digit runs (possible account numbers): {longruns}")
    ok &= not longruns

    have = norm_numbers(src)
    missing = sorted(n for n in norm_numbers(out) if n not in have)
    print(f"numbers in output not found verbatim in inputs or prompt: {missing}")
    print("RESULT:", "PASS (numbers listed above still need a hand trace)" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
