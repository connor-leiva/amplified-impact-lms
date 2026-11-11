"""Objective checks for every Morning Brief run: python3 skills/morning-brief/evals/make/objective_checks.py

For each run in evals/runs/<case>/output.md, against that case's inputs (the files and the prompt), it
checks what a script can check and writes evals/runs/<case>/objective-checks.txt:
- no em or en dashes; a Check Before Sending section; Title Case subject lines;
- a bottom line of three sentences or fewer; at most three items in Today's Three;
- every number over 20 appears in the inputs (smaller ones are counts and days, graded by hand);
- every weekday written with a date ("Fri Nov 13") is that date's weekday in 2026;
- every owner in Next Owned Actions is a name the inputs give that person, never "someone," a role or "TBD";
- no words judging a person; no account or routing numbers;
- the strings each case must show (the flagged words, the quotes) and must never show (a filled-in
  owner or date, a results claim).
Exit 1 on any FAIL.
"""

import calendar
import json
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
RUNS = SKILL / "evals" / "runs"
EVALS = json.loads((SKILL / "evals" / "evals.json").read_text())

PRACTICE_PROMPT = (
    "Morning brief for Thursday, November 12, 2026. I'm Hollis. The task register, last month's Lead-Source ROI, "
    "Monday's pipeline review, yesterday's huddle and our roster are attached."
)

JUDGING = [
    "struggling", "slipping", "dropped the ball", "lazy", "unreliable", "underperform", "step up",
    "falling short", "pulling their weight", "disappointing", "is behind", "are behind", "fell behind",
]
NOT_OWNERS = {"someone", "somebody", "we", "team", "tbd", "?", "ops", "[ops]", "priya or marco", "unassigned", ""}

CASES = {
    "practice": {
        "files": sorted(str(p.relative_to(SKILL)) for p in (SKILL / "practice").iterdir() if p.name != "README.md"),
        "prompt": PRACTICE_PROMPT,
        "must": [
            '"Someone should follow up with them next week about the feedback."',
            '"next week sometime"',
            'Owner: "TBD"',
            'Owner: "Team"',
            "One personal detail in the huddle was left out.",
            "Not in your task list yet: Saffron Quillby covers Nettle's showings on Mon Nov 16",
        ],
        "never": ["medical", "Nettle Ashcombe | Fri", "best source", "worst source", "cancel Facebook"],
        "three": ["Approve the Lantern Moss Lane marketing budget", "Review October lead-source numbers with the bookkeeper", "Decide on the Zillow Flex renewal"],
    },
    "case-1": {
        "case": 1,
        "must": [
            'Assignee: "[Ops]"',
            '"Caspian said he\'d get to it soon."',
            "52 against at least 60",
            "2 against at least 3",
            "Database Touches: not entered",
            "Contract ends 11/30.",
            "3:00 to 3:30 PM",
        ],
        "never": ["Post the November market update |", "Owner | Wilder Crane | Wed", "cost is $", "recommend"],
        "three": ["Sign off on the Q1 marketing calendar", "Decide on the dialer renewal (Dialtone Example)", "Approve Marlowe's open house signage order"],
    },
    "case-2": {
        "case": 2,
        "must": [
            '"Someone should follow up next week."',
            'Owner: "?"',
            'Due: "ASAP."',
            'Owner: "we"; due: "next month."',
            '"Can somebody pull the October closings report for the brokerage?"',
            "Only two items met the rules today.",
            "No numbers were attached this week",
            "Not in your task list yet.",
            "No roster attached: names are used as written.",
        ],
        "never": ["Nov 30", "Dec 1 (said", "Owner: Briar | Follow up"],
        "three": ["Decide whether to renew the postcard vendor", "Name an owner and set a date for the Fernhill Road sellers' follow-up"],
    },
    "case-3": {
        "case": 3,
        "must": [
            "I didn't assign owners or dates",
            "Stale",
            '"We closed eight in October."',
            "(Deals export, closed date in October): 6.",
            'Owner: "Ops"; due: "ASAP."',
            'Owner: "Priya or Marco"',
            '"I\'ll write the listing photo checklist. You\'ll have it by the 25th."',
            "nothing was marked done and nothing was given to Marco",
        ],
        "never": ["best month", "Marco Ellingham | Fri Nov 20", "marked done:", "Ops (Priya", "Owner: Priya Thornapple (Ops)"],
        "three": [
            "Name an owner for the reply to the Hollyhock Lane buyers about the HOA documents",
            "Approve the Q1 ad budget",
            "Name an owner and set a date for the Fairway Bend clear-to-close follow-up",
        ],
    },
}


def inputs_text(spec: dict) -> str:
    if "case" in spec:
        e = next(x for x in EVALS["evals"] if x["id"] == spec["case"])
        files, prompt = e["files"], e["prompt"]
    else:
        files, prompt = spec["files"], spec["prompt"]
    return prompt + "\n" + "\n".join((SKILL / f).read_text() for f in files)


def section(text: str, heading: str) -> str:
    m = re.search(rf"^## {re.escape(heading)}\s*\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    return m.group(1) if m else ""


def numbers(text: str) -> set:
    out = set()
    for raw in re.findall(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?", text):
        n = raw.replace(",", "")
        out.add(n)
        if "." in n:
            out.add(n.split(".")[0])
    return out


def check(case: str, spec: dict) -> list:
    out_path = RUNS / case / "output.md"
    text = out_path.read_text()
    src = inputs_text(spec)
    results = []

    def res(ok, label, note=""):
        results.append(("PASS" if ok else "FAIL", label + (f": {note}" if note else "")))

    res(not re.search("[\\u2013\\u2014]", text), "No em or en dashes")
    res("## Check Before Sending" in text, "Check Before Sending section")

    subjects = re.findall(r"^\*\*Subject: (.+?)\*\*$", text, re.M)
    bad = [s for s in subjects if not all(w[0].isupper() or w[0].isdigit() for w in s.split())]
    res(not bad, "Title Case subject lines", "; ".join(subjects) or "none")

    bl = " ".join(section(text, "Bottom Line").split())
    sentences = [s for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", bl) if s]
    res(len(sentences) <= 3, "Bottom line three sentences or fewer", f"{len(sentences)} sentences")

    three = section(text, "Today's Three")
    items = re.findall(r"^\d+\. \*\*(.+?)\.\*\*", three, re.M)
    res(len(items) <= 3, "At most three in Today's Three", f"{len(items)}")
    res(items == spec["three"], "Today's Three as expected, in order", " | ".join(items))

    src_nums = numbers(src)
    missing = sorted({n for n in numbers(text) if float(n) > 20 and n not in src_nums}, key=float)
    res(not missing, "Every number over 20 in the inputs (smaller ones graded by hand)", ", ".join(missing) or "all found")

    wrong = []
    for wd, mon, day in re.findall(r"\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Oct|Nov|Dec) (\d{1,2})\b", text):
        month = {"Oct": 10, "Nov": 11, "Dec": 12}[mon]
        if calendar.day_abbr[calendar.weekday(2026, month, int(day))] != wd:
            wrong.append(f"{wd} {mon} {day}")
    res(not wrong, "Every weekday matches its date in 2026", ", ".join(wrong) or "all match")

    owners = []
    actions = section(text, "Next Owned Actions")
    for row in re.findall(r"^\| (?!Action|---)(.+)$", actions, re.M):
        cells = [c.strip() for c in row.split("|")]
        if len(cells) > 1:
            owners.append(cells[1])
    bad_owner = [o for o in owners if o.lower() in NOT_OWNERS or o not in src]
    res(not bad_owner, "Every owner in Next Owned Actions is a name from the inputs", ", ".join(owners))

    lowered = text.lower()
    judged = [w for w in JUDGING if w in lowered]
    res(not judged, "No words judging a person", ", ".join(judged) or "none")
    res(not re.search(r"\b\d{9,}\b", text), "No account or routing numbers")

    absent = [m for m in spec["must"] if m not in text]
    res(not absent, "Must-appear strings present", "; ".join(absent) or f"{len(spec['must'])} found")
    present = [n for n in spec["never"] if n in text]
    res(not present, "Never-appear strings absent", "; ".join(present) or f"{len(spec['never'])} absent")
    return results


def main() -> int:
    failed = False
    for case, spec in CASES.items():
        results = check(case, spec)
        lines = [f"Objective checks: {case} / output.md"] + [f"- {s}  {label}" for s, label in results]
        (RUNS / case / "objective-checks.txt").write_text("\n".join(lines) + "\n")
        print("\n".join(lines))
        failed |= any(s == "FAIL" for s, _ in results)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
