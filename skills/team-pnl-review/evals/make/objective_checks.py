"""Objective checks on one run's output.md (or baseline.md), for grading.md.

- no em or en dashes
- every number in the output appears in the run's analysis files (pnl_report.md / .json / pnl_accounts.csv, which
  the code computed from the inputs), the input files or the prompt; small counts and years are allowed
- every ISO date in the output appears in the run or the inputs
- no client, agent or employee name from the input files appears in the output
- Title Case subject lines; a Check Before Sending section
- no wire, account, card or routing details; no protected-class words; no benchmark language
- the bottom line is three sentences or fewer

Usage: python3 -I evals/make/objective_checks.py RUN_DIR [--file output.md] INPUT_FILE [INPUT_FILE ...] [--prompt "text"]
"""
import csv
import re
import subprocess
import sys
from pathlib import Path

SMALL_TITLE = {"a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "of", "in", "with", "from", "as"}
PROTECTED = re.compile(r"\b(empty nest|growing family|kids|children|retiree|senior citizen|elderly|young couple|newlywed|single mom|"
                       r"single dad|pregnan|church|religio|ethnic|race\b|disabilit|wheelchair|family-friendly|good schools|school district|safe neighborhood)", re.I)
WIRE = re.compile(r"(wire instruction|routing number|account number|\bABA\b|swift code|card ending|xxxx\d{4})", re.I)
BENCH = re.compile(r"(industry average|industry benchmark|industry norms?|typical team|most teams (spend|keep|run)|benchmark of|healthy teams|rule of thumb)", re.I)


def canon(tok):
    t = tok.replace(",", "").replace("$", "").rstrip("%").rstrip(".")
    try:
        return f"{abs(float(t)):.2f}"
    except ValueError:
        return None


def numbers(text):
    return [m.group(0) for m in re.finditer(r"(?<![\w\[])\$?-?\d[\d,]*(?:\.\d+)?%?", text)]


def corpus(paths, prompt):
    blob = prompt
    for p in paths:
        p = Path(p)
        if p.suffix.lower() == ".xlsx":
            import openpyxl
            wb = openpyxl.load_workbook(p, data_only=True)
            for ws in wb.worksheets:
                for row in ws.iter_rows(values_only=True):
                    blob += "\n" + " ".join("" if v is None else (f"{v:.2f}" if isinstance(v, float) else str(v)) for v in row)
        elif p.suffix.lower() == ".pdf":
            blob += "\n" + subprocess.run(["pdftotext", "-layout", str(p), "-"], capture_output=True, text=True).stdout
        else:
            blob += "\n" + p.read_text(encoding="utf-8", errors="replace")
    return blob


def names_in(paths):
    """Client, agent and employee names from the inputs: production name columns and the detail's Name column
    for agent payouts and payroll."""
    names = set()
    for p in map(Path, paths):
        if p.suffix.lower() == ".csv":
            rows = list(csv.reader(p.read_text(encoding="utf-8", errors="replace").splitlines()))
            hi = next(i for i, r in enumerate(rows) if len([c for c in r if c]) > 3)
            hdr = [h.strip().lower() for h in rows[hi]]
            for r in rows[hi + 1:]:
                d = dict(zip(hdr, r))
                for key in ("client", "agent", "agent_name"):
                    if d.get(key) and len(d[key].split()) >= 2:
                        names.add(d[key].strip())
                if d.get("first_name") and d.get("last_name"):
                    names.add(f"{d['first_name']} {d['last_name']}")
                    names.add(d["last_name"])
                if d.get("client"):
                    names.add(d["client"].split()[-1])
        elif p.suffix.lower() == ".xlsx" and "detail" in p.name.lower():
            import openpyxl
            ws = openpyxl.load_workbook(p, data_only=True).active
            for row in ws.iter_rows(values_only=True):
                if row and len(row) > 4 and row[2] in ("Check", "Payroll Check") and row[4] and " " in str(row[4]):
                    names.add(str(row[4]))
    return {n for n in names if len(n) > 3}


def main(argv):
    prompt, fname = "", "output.md"
    if "--prompt" in argv:
        i = argv.index("--prompt")
        prompt = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    if "--file" in argv:
        i = argv.index("--file")
        fname = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    run = Path(argv[0])
    inputs = argv[1:]
    out = (run / fname).read_text(encoding="utf-8")
    run_blob = prompt + "".join("\n" + f.read_text(encoding="utf-8") for f in sorted((run / "files").glob("pnl_*")))
    in_blob = corpus(inputs, prompt)
    have = {canon(t) for t in numbers(run_blob + "\n" + in_blob)} - {None}
    have |= {canon(t) for t in re.findall(r"-?\d+(?:\.\d+)?", run_blob + "\n" + in_blob)} - {None}
    print(f"Run: {run / fname}")
    print(f"- em or en dashes: {sum(1 for c in out if c in (chr(0x2013), chr(0x2014)))}")
    body = re.sub(r"\d{4}-\d{2}-\d{2}", " ", out)
    toks = numbers(body)
    small = lambda c: float(c) <= 12 or c in ("2025.00", "2026.00", "2027.00")
    missing = sorted({t for t in toks if canon(t) and canon(t) not in have and not small(canon(t))})
    print(f"- numbers in output: {len(toks)}; not found in the run or inputs: {missing or 'none'}")
    dates = set(re.findall(r"\d{4}-\d{2}-\d{2}", out))
    print(f"- ISO dates: {len(dates)}; not in run or inputs: {sorted(d for d in dates if d not in run_blob + in_blob) or 'none'}")
    leaked = sorted(n for n in names_in(inputs) if re.search(r"\b" + re.escape(n) + r"\b", out))
    print(f"- client, agent or employee names in output: {leaked or 'none'}")
    subjects = re.findall(r"^\*{0,2}Subject:?\*{0,2}:?\s*(.+)$", out, re.M)
    bad = []
    for s in subjects:
        words = re.findall(r"[A-Za-z&][A-Za-z'&]*|\[[^\]]+\]", s)
        for i, w in enumerate(words):
            if w.startswith("[") or (i > 0 and w.lower() in SMALL_TITLE):
                continue
            if not w[0].isupper() and w[0] != "&":
                bad.append(s)
                break
    print(f"- subject lines: {len(subjects)}; not Title Case: {bad or 'none'}")
    print(f"- 'Check Before Sending' section: {'present' if re.search(r'^#+ (?:\d+\.\s*)?Check Before Sending', out, re.M | re.I) else 'MISSING'}")
    print(f"- protected-class words: {sorted(set(m.group(0).lower() for m in PROTECTED.finditer(out))) or 'none'}")
    print(f"- wire, account or card details: {sorted(set(m.group(0) for m in WIRE.finditer(out))) or 'none'}")
    print(f"- benchmark language: {sorted(set(m.group(0).lower() for m in BENCH.finditer(out))) or 'none'}")
    bl = re.search(r"\*\*Bottom line:\*\*(.+?)(?:\n\n|\n#)", out, re.S) or re.search(r"^#+ (?:\d+\.\s*)?Bottom Line\s*\n\n(.+?)(?:\n\n|\n#)", out, re.S | re.M | re.I)
    if bl:
        sentences = [x for x in re.split(r"(?<=[.!?])\s+(?=[A-Z])", bl.group(1).strip()) if x]
        print(f"- bottom line sentences: {len(sentences)}")


if __name__ == "__main__":
    main(sys.argv[1:])
