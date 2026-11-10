"""Objective checks for fub-automation-audit runs.

python3 skills/fub-automation-audit/evals/make/objective_checks.py <case-id> [output.md]

Checks: no em or en dashes; the output's sections in SKILL.md's order, ending with Check Before Sending; a bottom
line of three sentences or fewer; every plan name in the input appears; every automated text step is named in the
Texting-Consent Risk section; the mode (Utah lines in Utah mode, "State rules were not checked" in general mode);
the outreach-rules.md source line; never-say phrases (claims of a change made, legal rulings); each fair housing
phrase quoted at most once; and every number in the output found in the input, in a reference, or as a sum or
difference written out with its arithmetic ("150 (30 + 120)", "20 days (30 - 10)"), each miss listed for a person
to grade. Reads PDFs with pdftotext. Writes nothing; prints a report.
"""
import re
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
REFS = [SKILL / "references" / n for n in ("fub-inputs.md", "audit-rules.md", "utah-texting-notes.md")]
REFS.append(SKILL.parent / "_shared" / "outreach-rules.md")

SECTIONS = ["Flags", "Bottom Line", "What I Used", "Inventory", "Gaps", "Overlaps", "Texting-Consent Risk",
            "Template Wording", "Fix List", "Questions for the Team", "Check Before Sending"]

NEVER = [r"\bI (?:changed|paused|created|deleted|turned off|turned on|sent|updated|removed|disabled|enabled)\b",
         r"\b(?:has|have) been (?:paused|changed|updated|turned off|deleted|removed|disabled)\b",
         r"\bI've (?:changed|paused|updated|turned)\b", r"\bis legal\b", r"\bare legal\b", r"\billegal\b",
         r"\bcompliant\b", r"\bviolat\w*", r"\bTCPA-compliant\b"]
FAIR = ["young families", "great schools", "perfect for families", "family-friendly", "safe neighborhood"]

CASES = {
    "practice": {
        "inputs": ["practice/PRACTICE Gumdrop Hollow action plans, copied from FUB.md",
                   "practice/PRACTICE Action plan Open House Visitor, printed.pdf",
                   "practice/PRACTICE Gumdrop Hollow automations list.csv",
                   "practice/PRACTICE Gumdrop Hollow stages, lead sources and texting.txt"],
        "prompt": "Here are our Follow Up Boss action plans, our automations list, and our stages and lead sources.",
        "plans": ["New Website Lead", "Portal Buyer 14 Day", "Facebook Seller Lead", "Open House Visitor",
                  "Long-Term Nurture", "Monthly Market Email", "Under Contract to Close", "Closing Day Thank You",
                  "Past Client Care", "Home Anniversary", "Nurture Drip", "Market Email", "Under Contract",
                  "Closed Thank You", "Past Client", "Back On Site"],
        "texts": ["Website (IDX) initial text", "HomeFinder Example initial text", "Facebook Lead Ads initial text",
                  "Open House 3 Text"],
        "utah": True,
    },
    "case-2": {
        "inputs": ["evals/files/case2/Our 3 action plans, typed from FUB.txt"],
        "prompt": "Here are our three FUB action plans. Can you check them for gaps, overlaps and texting risk?",
        "plans": ["Buyer Speed Plan", "Seller Value Plan", "Open House Thank You"],
        "texts": ["Buyer 5 Text, day 0", "Buyer 5 Text, day 2", "Buyer 5 Text, day 4", "Seller Value Plan, day 0 text",
                  "Open House Thanks"],
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
    return {n.replace(",", "") for n in re.findall(r"\d[\d,]*(?:\.\d+)?", text)}


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    cfg = CASES[case]
    text = (SKILL / "evals" / "runs" / case / name).read_text(encoding="utf-8")
    src = "\n".join(read(SKILL / f) for f in cfg["inputs"]) + "\n" + cfg["prompt"]
    refs = "\n".join(p.read_text(encoding="utf-8") for p in REFS)
    out = []

    def rec(label, ok, note=""):
        out.append(("PASS" if ok else "FAIL", label, note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))

    heads = re.findall(r"^## (.+?)\s*$", text, re.M)
    order = [h for h in heads if h in SECTIONS]
    rec("Sections in SKILL.md's order", order == SECTIONS, f"found: {order}" if order != SECTIONS else "")
    rec("Check Before Sending is the last section", bool(heads) and heads[-1] == "Check Before Sending")

    bl = section(text, "Bottom Line").strip()
    sentences = [s for s in re.split(r"(?:(?<=[.!?])|(?<=[.!?]\"))\s+(?=[A-Z])", bl) if s.strip()]
    rec("Bottom line is three sentences or fewer", 0 < len(sentences) <= 3, f"{len(sentences)} sentences")

    inv = section(text, "Inventory")
    missing = [p for p in cfg["plans"] if p not in inv]
    rec("Every plan and automation in the inventory", not missing, ", ".join(missing))

    risk = section(text, "Texting-Consent Risk")
    missing = [t for t in cfg["texts"] if t not in risk]
    rec("Every automated text step named in Texting-Consent Risk", not missing, ", ".join(missing))

    if cfg["utah"]:
        rec("Utah mode: Utah Code 13-25a-103(3) cited, texts not confirmed",
            "13-25a-103(3)" in text and "not confirmed" in text)
    else:
        rec("General mode: state rules were not checked, no Utah law cited",
            "State rules were not checked" in text and "13-25a" not in text and "Utah" not in text)
    rec("Basics cite outreach-rules.md with its Last verified date",
        "outreach-rules.md" in risk and "Last verified 2026-11-08" in risk)

    hits = [m.group(0) for p in NEVER for m in re.finditer(p, text, re.I)]
    rec("No claim of a change made and no legal ruling", not hits, ", ".join(hits))

    many = [f"{w} x{text.lower().count(w)}" for w in FAIR if text.lower().count(w) > 1]
    rec("Each fair housing phrase quoted at most once", not many, ", ".join(many))

    # Numbers. Drop table first-column indices and references to rows, plans, steps, items, questions and pages.
    body = re.sub(r"^\| *\d+ *\|", "|", text, flags=re.M)
    body = re.sub(r"^\d+\. ", "", body, flags=re.M)
    body = re.sub(r"\b(?:rows?|plans?|steps?|items?|questions?|pages?|Flags?|chunk)\s+\d+(?:\s*(?:to|and)\s*\d+)?",
                  "", body, flags=re.I)
    have = nums(src)
    ref_nums = nums(refs)
    verified = set()
    changed = True
    while changed:
        changed = False
        for m in re.finditer(r"\b(\d+)(?: days?)? \((\d+) ([+-]) (\d+)\)", body):
            n, a, op, b = int(m.group(1)), int(m.group(2)), m.group(3), int(m.group(4))
            good = (a + b if op == "+" else a - b) == n
            known = all(str(x) in have or str(x) in verified for x in (a, b))
            if good and known and str(n) not in verified:
                verified.add(str(n))
                changed = True
    bad_math = [m.group(0) for m in re.finditer(r"\b(\d+)(?: days?)? \((\d+) ([+-]) (\d+)\)", body)
                if (int(m.group(2)) + int(m.group(4)) if m.group(3) == "+" else int(m.group(2)) - int(m.group(4)))
                != int(m.group(1))]
    rec("Every written-out sum or difference is right", not bad_math, ", ".join(bad_math))
    found = nums(body)
    from_refs = sorted((found - have - verified) & ref_nums, key=lambda s: float(s))
    unknown = sorted(found - have - verified - ref_nums, key=lambda s: float(s))
    out.append(("NOTE", "Computed days and gaps, each checked against its arithmetic", ", ".join(sorted(verified, key=int))))
    out.append(("NOTE", "Numbers from the skill's references, not the input", ", ".join(from_refs)))
    rec("Numbers not found in the input, a reference or the arithmetic (grade each)", not unknown, ", ".join(unknown))

    print(f"Objective checks: {case} / {name}")
    for status, label, note in out:
        print(f"- {status:5} {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
