"""Objective checks for one run of pricing-conversation-prep.

Usage: python3 -I objective_checks.py OUTPUT.md PROMPT_TEXT INPUT_FILE [INPUT_FILE ...] [--forbid TERM ...]

Prints:
- em or en dashes found (must be 0)
- whether a "Check before sending" section is present
- every number in the output that does not appear in the inputs or the prompt, for the grader to confirm
  each one is arithmetic shown from the inputs (a ratio, a difference, a count, a median)
- every forbidden term found (agent-only codes, phone numbers, loan balances, protected-class wording)
PDFs are read with pdftotext; CSVs as text.
"""
import csv
import re
import subprocess
import sys

MONTHS = {m: i for i, m in enumerate(["january", "february", "march", "april", "may", "june", "july", "august",
                                      "september", "october", "november", "december"], 1)}


def text_of(path):
    if path.lower().endswith(".pdf"):
        return subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True).stdout
    if path.lower().endswith(".csv"):
        with open(path, encoding="utf-8", newline="") as f:
            return "\n".join(" | ".join(row) for row in csv.reader(f))
    return open(path, encoding="utf-8").read()


def numbers(t):
    t = re.sub(r"(\d{4})-(\d{2})-(\d{2})", lambda m: f" {m.group(1)} {int(m.group(2))} {int(m.group(3))} ", t)
    t = re.sub(r"(\d{1,2})/(\d{1,2})/(\d{4})", lambda m: f" {m.group(3)} {int(m.group(1))} {int(m.group(2))} ", t)
    t = re.sub(r"\b(" + "|".join(MONTHS) + r")\s+(\d{1,2}),?\s+(\d{4})",
               lambda m: f" {m.group(3)} {MONTHS[m.group(1).lower()]} {int(m.group(2))} ", t, flags=re.I)
    out = set()
    for m in re.finditer(r"\d[\d,]*(?:\.\d+)?", t):
        s = m.group(0).rstrip(",").replace(",", "")
        try:
            v = float(s)
        except ValueError:
            continue
        out.add(v)
    return out


def main():
    args = sys.argv[1:]
    forbid = []
    if "--forbid" in args:
        i = args.index("--forbid")
        forbid = args[i + 1:]
        args = args[:i]
    out_path, prompt, files = args[0], args[1], args[2:]
    out = open(out_path, encoding="utf-8").read()
    src = prompt + "\n" + "\n".join(text_of(f) for f in files)
    have = numbers(src)
    dashes = len(re.findall(r"[–—]", out))
    print(f"em or en dashes: {dashes}")
    print(f"Check before sending section: {'yes' if re.search(r'check before sending', out, re.I) else 'NO'}")
    missing = sorted(v for v in numbers(out) if v not in have)
    print(f"numbers in output: {len(numbers(out))}; not literally in inputs: {len(missing)}")
    print("  " + ", ".join(f"{v:g}" for v in missing))
    for term in forbid:
        hits = [m.start() for m in re.finditer(re.escape(term), out, re.I)]
        print(f"forbidden '{term}': {len(hits)}")


if __name__ == "__main__":
    main()
