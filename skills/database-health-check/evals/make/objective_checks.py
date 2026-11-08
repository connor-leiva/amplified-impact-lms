"""Objective checks on one run's output.md, for grading.md.

- no em or en dashes
- every number in the output appears in the run's own analysis output (health_report.md / .json, which the
  code computed from the inputs), the input files, the prompt, or the skill's stated defaults
- no contact names, emails or phone numbers from the input file appear in output.md
- Title Case subject lines; a Check Before Sending section; opt-out lines on emails and texts
- no protected-class or family-status words in the drafts; no wire, account or routing details; no dollar amounts

Usage: python3 -I evals/make/objective_checks.py RUN_DIR INPUT_FILE [INPUT_FILE ...] [--prompt "text"]
"""
import csv
import json
import re
import sys
from pathlib import Path

SKILL_NUMBERS = {"30", "60", "90", "180", "365", "12", "730", "1", "2", "3", "4", "5", "6", "7", "8", "10", "50", "100", "120", "300", "500", "1.0", "64", "11", "2026", "2019", "24", "18", "45"}
SMALL_TITLE = {"a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "of", "in", "with", "from", "as"}
PROTECTED = re.compile(r"\b(empty nest|growing family|kids|children|retire|retiree|retirement|senior|elderly|young couple|newlywed|"
                       r"single mom|single dad|pregnan|baby|church|religio|ethnic|race\b|disabilit|wheelchair|veteran|"
                       r"downsiz|starter family|family-friendly|family friendly|good schools|school district|safe neighborhood)", re.I)
WIRE = re.compile(r"(wire instruction|routing number|account number|\bABA\b|swift code)", re.I)


def nums(text):
    out = []
    for m in re.finditer(r"(?<![\w.\[])\d[\d,]*(?:\.\d+)?%?", text):
        raw = m.group(0).rstrip("%").rstrip(".,").replace(",", "")
        out.append(raw)
    return out


def corpus_numbers(blob):
    found = set(re.findall(r"\d+(?:\.\d+)?", blob.replace(",", "")))
    found |= {n[:-2] for n in found if n.endswith(".0")}
    return found


def main(argv):
    prompt = ""
    if "--prompt" in argv:
        i = argv.index("--prompt")
        prompt = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    run = Path(argv[0])
    inputs = [Path(a) for a in argv[1:]]
    out = (run / "output.md").read_text(encoding="utf-8")
    blob = prompt
    for f in (run / "files").glob("health_report.*"):
        blob += "\n" + f.read_text(encoding="utf-8")
    contact_names, contact_emails, contact_phones = set(), set(), set()
    for p in inputs:
        if p.suffix.lower() == ".csv":
            text = p.read_text(encoding="utf-8", errors="replace")
            blob += "\n" + text
            for row in csv.reader(text.splitlines()):
                for cell in row:
                    c = cell.strip()
                    if "@" in c and "." in c:
                        contact_emails.add(c.lower())
                    d = re.sub(r"\D", "", c)
                    if 10 <= len(d) <= 11 and re.search(r"\d{3}\D{0,2}\d{3}\D\d{4}", c):
                        contact_phones.add(d[-10:])
            rows = list(csv.reader(text.splitlines()))
            hdr_i = next(i for i, r in enumerate(rows) if len([c for c in r if c]) > 3)
            hdr = [h.strip().lower() for h in rows[hdr_i]]
            for key in ("name", "full name"):
                if key in hdr:
                    k = hdr.index(key)
                    for r in rows[hdr_i + 1:]:
                        if k < len(r) and len(r[k].split()) >= 2:
                            contact_names.add(r[k].strip())
        elif p.suffix.lower() == ".pdf":
            import subprocess
            blob += "\n" + subprocess.run(["pdftotext", str(p), "-"], capture_output=True, text=True).stdout
    run_blob = prompt
    for f in (run / "files").glob("health_report.*"):
        run_blob += "\n" + f.read_text(encoding="utf-8")
    have_run = corpus_numbers(run_blob)
    have = corpus_numbers(blob)
    print(f"Run: {run}")
    dashes = sum(1 for c in out if c in (chr(0x2013), chr(0x2014)))
    print(f"- em or en dashes: {dashes}")
    numbers = nums(re.sub(r"\d{4}-\d{2}-\d{2}", " ", out))
    missing = sorted({n for n in numbers if n not in have and n not in SKILL_NUMBERS}, key=lambda x: float(x))
    input_only = sorted({n for n in numbers if n in have and n not in have_run and n not in SKILL_NUMBERS}, key=lambda x: float(x))
    print(f"- numbers in output: {len(numbers)}; in the run's analysis output or the prompt or the skill's defaults: {len(numbers) - sum(1 for n in numbers if n not in have_run and n not in SKILL_NUMBERS)}")
    print(f"  found only in the raw input files (check by hand): {input_only or 'none'}")
    print(f"  not traceable anywhere: {missing or 'none'}")
    dates = set(re.findall(r"\d{4}-\d{2}-\d{2}", out))
    print(f"- ISO dates in output: {sorted(dates)}; not in run or inputs: {sorted(d for d in dates if d not in blob) or 'none'}")
    leaked_names = sorted(n for n in contact_names if n in out)
    leaked_emails = sorted(e for e in contact_emails if e in out.lower())
    out_digits = re.sub(r"\D", "", out)
    leaked_phones = sorted(p for p in contact_phones if p in out_digits)
    print(f"- contact names in output: {leaked_names[:10] or 'none'}")
    print(f"- contact emails in output: {leaked_emails[:10] or 'none'}")
    print(f"- contact phones in output: {leaked_phones[:10] or 'none'}")
    subjects = re.findall(r"^Subject:\s*(.+)$", out, re.M)
    bad = []
    for s in subjects:
        words = re.findall(r"[A-Za-z][A-Za-z']*|\[[^\]]+\]", s)
        for i, w in enumerate(words):
            if w.startswith("["):
                continue
            if i > 0 and w.lower() in SMALL_TITLE:
                continue
            if not w[0].isupper():
                bad.append(s)
                break
    print(f"- subject lines: {len(subjects)}; not Title Case: {bad or 'none'}")
    print(f"- 'Check Before Sending' section: {'present' if re.search(r'^#+ Check Before Sending', out, re.M) else 'MISSING'}")
    emails = len(re.findall(r"^Subject:", out, re.M))
    optouts = len(re.findall(r"To stop these emails, reply UNSUBSCRIBE", out))
    addr = len(re.findall(r"\[Sender Postal Address\]", out))
    print(f"- emails: {emails}; with opt-out line: {optouts}; postal address placeholders: {addr}")
    texts = re.findall(r"^Text \(.*$", out, re.M)
    stops = sum(1 for t in texts if "Reply STOP to opt out" in t)
    print(f"- text drafts: {len(texts)}; ending with Reply STOP: {stops}")
    drafts = out.split("Nurture Drafts", 1)[-1]
    print(f"- protected-class or family words in drafts: {sorted(set(m.group(0).lower() for m in PROTECTED.finditer(drafts))) or 'none'}")
    print(f"- wire or account details: {sorted(set(m.group(0) for m in WIRE.finditer(out))) or 'none'}")
    print(f"- dollar amounts: {re.findall(r'[$]\s?\d[\d,]*', out) or 'none'}")
    bl = re.search(r"\*\*Bottom line:\*\*(.+?)(?:\n\n|\n#)", out, re.S)
    if bl:
        sentences = [x for x in re.split(r"(?<=[.!?])\s+", bl.group(1).strip()) if x]
        print(f"- bottom line sentences: {len(sentences)}")


if __name__ == "__main__":
    main(sys.argv[1:])
