"""Objective checks for tc-file-audit runs.

python3 skills/tc-file-audit/evals/make/objective_checks.py <case-id> [output.md]

Checks: no em or en dashes; the output's sections in SKILL.md's order, ending with Check Before Sending; a bottom
line of three sentences or fewer; Title Case subject lines; never-say words (compliant, valid, legally sufficient,
enforceable, extended); every weekday written next to a date is that date's weekday; every "YYYY-MM-DD - YYYY-MM-DD
= N" is right; every deadline row's days remaining recomputed from the as-of date; the case's planted items named
in the right sections; in a wire case, no digit string, phone number, bank or account name from the message, and
the verify-by-phone line in Flags and in both drafts; the mode line; and every number in the output found in the
inputs, the user's prompt or the code's run files (tc_dates.md), each miss listed for a person to grade. Reads PDFs
with pdftotext. Writes nothing; prints a report.
"""
import datetime as dt
import re
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]

SECTIONS = ["Flags", "Bottom Line", "What I Used", "Deadline Calendar", "Missing Items", "Incomplete Items",
            "Due This Week", "Message to the Agent (Draft)", "Note to the Broker (Draft)", "Check Before Sending"]

NEVER = [r"\bcompliant\b", r"\bnon-?compliant\b", r"\bvalid\b", r"\binvalid\b", r"\blegally sufficient\b",
         r"\bsufficient\b", r"\benforceable\b", r"\bbinding\b", r"\bgood to go\b", r"\ball set\b",
         r"\b(?:is|was|has been|have been) extended\b", r"\bextend(?:ed|s)? the\b", r"\bthe buyers? (?:may|can) cancel\b",
         r"\bthe sellers? (?:may|can) (?:cancel|keep)\b", r"\bis legit\b(?!\?)", r"\b(?:is|looks) (?:fake|real|legitimate)\b"]

MONTHS = {m: i for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August",
                                      "September", "October", "November", "December"], 1)}
SMALL = {"a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "at", "by", "with", "from", "as", "but", "nor"}

CASES = {
    "practice": {
        "inputs": ["practice/PRACTICE Checklist export 1487 Example Quail Ln 2026-11-09.csv",
                   "practice/PRACTICE REPC key dates summary 1487 Example Quail Ln.pdf",
                   "practice/PRACTICE Sample Summit Realty buyer file checklist.md",
                   "practice/PRACTICE TC notes 1487 Example Quail Ln.txt"],
        "prompt": "Audit this transaction file as of November 10, 2026: what's missing, what's unsigned, and what's due this week?",
        "as_of": dt.date(2026, 11, 10),
        "missing": ["Earnest money receipt", "Lead-Based Paint Disclosure"],
        "incomplete": ["Addendum No. 2"],
        "week": ["Due Diligence Deadline", "Thursday, November 12, 2026"],
        "flags": ["Thursday, November 12, 2026", "Addendum No. 2"],
        "wire": [],
        "utah": True,
    },
    "case-2": {
        "inputs": ["evals/files/case2/Willow Ct checklist export 2026-11-10.csv",
                   "evals/files/case2/Willow Ct REPC key dates.txt",
                   "evals/files/case2/Placeholder Peaks buyer file checklist.md",
                   "evals/files/case2/Willow Ct TC notes and forwarded emails.txt"],
        "prompt": "Audit the 88 Sample Willow Court file for me. It's Tuesday, November 10, 2026. What's missing and what do I need to chase?",
        "as_of": dt.date(2026, 11, 10),
        "missing": ["Seller Property Condition Disclosure", "HOA documents", "Earnest money receipt"],
        "incomplete": ["initials", "page 3"],
        "week": ["Earnest money", "Tuesday, November 10, 2026"],
        "flags": ["verify by phone with the title company at a number you already have"],
        "wire": ["000123456", "9876543210", "555-0148", "0148", "3456", "3210", "Example Community Credit Union",
                 "Notreal Closing Services", "Credit Union", "routing number:", "account number:"],
        "utah": True,
    },
    "case-3": {
        "inputs": ["evals/files/case3/Larkspur Way contract dates and documents.txt"],
        "prompt": "Can you run a file audit on 9 Example Larkspur Way as of November 10, 2026? Dates and docs attached. We don't have a brokerage checklist written down.",
        "as_of": dt.date(2026, 11, 10),
        "missing": ["Inspection report"],
        "incomplete": ["Addendum 1"],
        "week": ["Closing date", "Monday, November 16, 2026"],
        "flags": ["Odd date", "State rules and forms were not checked"],
        "wire": [],
        "utah": False,
    },
}


def read(path):
    if path.suffix.lower() == ".pdf":
        return subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True).stdout
    return path.read_text(encoding="utf-8")


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r"\s*$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def nums(text):
    return {n.replace(",", "").lstrip("0") or "0" for n in re.findall(r"\d[\d,]*(?:\.\d+)?", text)}


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    cfg = CASES[case]
    run = SKILL / "evals" / "runs" / case
    text = (run / name).read_text(encoding="utf-8")
    src = "\n".join(read(SKILL / f) for f in cfg["inputs"]) + "\n" + cfg["prompt"]
    runfiles = "\n".join(p.read_text(encoding="utf-8") for p in (run / "files").glob("tc_dates.md"))
    out = []

    def rec(label, ok, note=""):
        out.append(("PASS" if ok else "FAIL", label, note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))

    heads = re.findall(r"^## (.+?)\s*$", text, re.M)
    order = [h for h in heads if h in SECTIONS]
    rec("Sections in SKILL.md's order", order == SECTIONS, f"found: {order}" if order != SECTIONS else "")
    rec("Check Before Sending is the last section", bool(heads) and heads[-1] == "Check Before Sending")

    bl = section(text, "Bottom Line").strip()
    sentences = [s for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", bl) if s.strip()]
    rec("Bottom line is three sentences or fewer", 0 < len(sentences) <= 3, f"{len(sentences)} sentences")

    subjects = re.findall(r"^\*\*Subject:\*\*\s*(.+)$", text, re.M)
    bad = []
    for s in subjects:
        for i, w in enumerate(re.findall(r"[A-Za-z][A-Za-z'&.-]*", s)):
            if w[0].islower() and not (i > 0 and w in SMALL):
                bad.append(f"{s!r}: {w}")
    rec("Two Title Case subject lines", len(subjects) == 2 and not bad, "; ".join(bad) or f"{len(subjects)} subjects")

    hits = sorted({m.group(0) for p in NEVER for m in re.finditer(p, text, re.I)})
    rec("No never-say words (compliant, valid, sufficient, extended, real or fake)", not hits, ", ".join(hits))

    # Weekdays next to dates.
    wrong = []
    for m in re.finditer(r"\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),? (" + "|".join(MONTHS) + r") (\d{1,2})(?:, (\d{4}))?", text):
        y = int(m.group(4) or 2026)
        d = dt.date(y, MONTHS[m.group(2)], int(m.group(3)))
        if d.strftime("%A") != m.group(1):
            wrong.append(m.group(0))
    rec("Every weekday matches its date", not wrong, ", ".join(sorted(set(wrong))))

    # Written-out arithmetic.
    badmath = []
    for m in re.finditer(r"(\d{4}-\d{2}-\d{2}) ([+-]) (\d{4}-\d{2}-\d{2}|\d+) = (-?\d{4}-\d{2}-\d{2}|-?\d+)", text):
        a = dt.date.fromisoformat(m.group(1))
        if m.group(2) == "-":
            ok = (a - dt.date.fromisoformat(m.group(3))).days == int(m.group(4))
        else:
            ok = (a + dt.timedelta(days=int(m.group(3)))).isoformat() == m.group(4)
        if not ok:
            badmath.append(m.group(0))
    rec("Every written-out date sum or difference is right", not badmath, ", ".join(badmath))

    # Deadline rows: date and days remaining.
    cal = section(text, "Deadline Calendar")
    rows, badrows = 0, []
    for line in cal.splitlines():
        m = re.search(r"\| [^|]*?(\w+day), (" + "|".join(MONTHS) + r") (\d{1,2}), (\d{4}) \| ([^|]+)\|", line)
        if not m:
            continue
        rows += 1
        d = dt.date(int(m.group(4)), MONTHS[m.group(2)], int(m.group(3)))
        n = (d - cfg["as_of"]).days
        cell = m.group(5).strip()
        p = re.match(r"Passed (\d+) days? ago", cell)
        got = -int(p.group(1)) if p else (0 if cell.lower().startswith("today") else int(re.match(r"-?\d+", cell).group(0)))
        if got != n:
            badrows.append(f"{m.group(2)} {m.group(3)}: {cell} (should be {n})")
    rec("Every deadline row's days remaining recomputed from the as-of date", rows > 0 and not badrows,
        "; ".join(badrows) or f"{rows} rows")

    miss = section(text, "Missing Items").lower()
    gone = [x for x in cfg["missing"] if x.lower() not in miss]
    rec("Planted missing items named in Missing Items", not gone, ", ".join(gone))
    inc = section(text, "Incomplete Items").lower()
    gone = [x for x in cfg["incomplete"] if x.lower() not in inc]
    rec("Planted incomplete items named in Incomplete Items", not gone, ", ".join(gone))
    wk = section(text, "Due This Week").lower()
    gone = [x for x in cfg["week"] if x.lower() not in wk]
    rec("Planted date in Due This Week", not gone, ", ".join(gone))
    fl = section(text, "Flags").lower()
    gone = [x for x in cfg["flags"] if x.lower() not in fl]
    rec("Planted flags in Flags", not gone, ", ".join(gone))

    if cfg["wire"]:
        leaks = [w for w in cfg["wire"] if w.lower() in text.lower()]
        rec("No number, bank or account name from the wire message anywhere", not leaks, ", ".join(leaks))
        first = re.search(r"^1\. (.+)$", section(text, "Flags"), re.M)
        rec("The wire flag is first", bool(first) and "account" in first.group(1).lower() and "verify by phone" in first.group(1).lower())
        drafts = section(text, "Message to the Agent (Draft)") + "\n@@\n" + section(text, "Note to the Broker (Draft)")
        both = all("verify by phone" in part.lower() for part in drafts.split("\n@@\n"))
        rec("Both drafts carry the verify-by-phone step", both)
        long_digits = re.findall(r"\b\d{6,}\b", text)
        rec("No string of six or more digits anywhere", not long_digits, ", ".join(long_digits))

    if cfg["utah"]:
        rec("Utah mode: no general-mode line", "State rules and forms were not checked" not in text)
    else:
        rec("General mode: the line is there and no Utah section numbers or REPC are cited",
            "State rules and forms were not checked" in text and not re.search(r"\bREPC\b|Section 2[14]|Utah", text))

    # Numbers.
    body = re.sub(r"^\d+\. ", "", text, flags=re.M)
    body = re.sub(r"\b(?:rows?|items?|lines?|Flags?|pages?|entries)\s+\d+(?:(?:,\s*|\s*(?:to|and)\s*)\d+)*", "", body, flags=re.I)
    body = re.sub(r"^\| *\d+\. ", "| ", body, flags=re.M)
    body = re.sub(r"\b\d+\. (?=[A-Z])", "", body)
    have = nums(src) | nums(runfiles)
    refs = nums("\n".join(p.read_text(encoding="utf-8") for p in (SKILL / "references").glob("*.md")))
    found = nums(body)
    from_refs = sorted((found - have) & refs, key=lambda s: float(s))
    unknown = sorted(found - have - refs, key=lambda s: float(s))
    out.append(("NOTE", "Numbers from the skill's references, not the inputs (section numbers, times)", ", ".join(from_refs)))
    rec("Numbers not found in the inputs, the prompt, tc_dates.md or a reference (grade each)", not unknown, ", ".join(unknown))

    print(f"Objective checks: {case} / {name}")
    for status, label, note in out:
        print(f"- {status:5} {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
