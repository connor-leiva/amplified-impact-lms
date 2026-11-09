"""Objective checks for one run of offer-strategy.

Usage: python3 -I objective_checks.py OUTPUT.md PROMPT_TEXT INPUT_FILE [INPUT_FILE ...]
                                       [--forbid TERM ...] [--email-forbid TERM ...]

Prints:
- em or en dashes found (must be 0)
- whether a "Check before sending" section is present
- every "Subject:" line and whether it is in Title Case
- every number in the output that does not appear in the inputs or the prompt, for the grader to confirm
  each one is arithmetic shown from the inputs (a difference, a ratio, a median, a date count) or a
  labeled recommendation
- every forbidden term found anywhere (--forbid) and inside the buyer email only (--email-forbid)
PDFs are read with pdftotext; CSVs as text.
"""
import csv
import re
import subprocess
import sys

MONTHS = {m: i for i, m in enumerate(["january", "february", "march", "april", "may", "june", "july", "august",
                                      "september", "october", "november", "december"], 1)}
SMALL = {"a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "vs"}


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
            out.add(float(s))
        except ValueError:
            continue
    return out


def title_case(subject):
    words = re.findall(r"[A-Za-z][A-Za-z']*", subject)
    bad = [w for i, w in enumerate(words) if w[0].islower() and not (i > 0 and w in SMALL)]
    return not bad, bad


def pattern(term):
    """A section number like 4(c) must not match inside 24(c); words match anywhere."""
    p = re.escape(term)
    return r"(?<![0-9.])" + p if term[:1].isdigit() else p


def buyer_email(out):
    m = re.search(r"^#+\s*\d*\.?\s*Buyer Email.*?$(.*?)(?=^#+\s*\d*\.?\s*Check Before Sending)", out,
                  re.I | re.M | re.S)
    return m.group(1) if m else ""


def main():
    args = sys.argv[1:]
    forbid, email_forbid = [], []
    if "--email-forbid" in args:
        i = args.index("--email-forbid")
        email_forbid = args[i + 1:]
        args = args[:i]
    if "--forbid" in args:
        i = args.index("--forbid")
        forbid = args[i + 1:]
        args = args[:i]
    out_path, prompt, files = args[0], args[1], args[2:]
    out = open(out_path, encoding="utf-8").read()
    src = prompt + "\n" + "\n".join(text_of(f) for f in files)
    have = numbers(src)
    dashes = len(re.findall("[" + chr(0x2013) + chr(0x2014) + "]", out))
    print(f"em or en dashes: {dashes}")
    print(f"Check before sending section: {'yes' if re.search(r'check before sending', out, re.I) else 'NO'}")
    for m in re.finditer(r"Subject:\**\s*(.+)", out):
        ok, bad = title_case(m.group(1))
        print(f"subject: {m.group(1).strip()} -> {'Title Case' if ok else 'NOT Title Case: ' + ', '.join(bad)}")
    missing = sorted(v for v in numbers(out) if v not in have)
    print(f"numbers in output: {len(numbers(out))}; not literally in inputs: {len(missing)}")
    print("  " + ", ".join(f"{v:g}" for v in missing))
    for term in forbid:
        hits = len(re.findall(pattern(term), out, re.I))
        print(f"forbidden anywhere '{term}': {hits}")
    email = buyer_email(out)
    print(f"buyer email found: {'yes' if email else 'NO'} ({len(email.split())} words)")
    for term in email_forbid:
        hits = len(re.findall(pattern(term), email, re.I))
        print(f"forbidden in buyer email '{term}': {hits}")


if __name__ == "__main__":
    main()
