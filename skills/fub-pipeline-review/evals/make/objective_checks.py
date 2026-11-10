"""Objective checks for fub-pipeline-review runs.

python3 -I skills/fub-pipeline-review/evals/make/objective_checks.py <case> [output.md]
  case: case-1 (the full practice set), case-2 (a People export only, with odd rows)

Checks: no em or en dashes; Title Case subject lines (when there are any); a Check Before Sending section; Flags before
the Bottom Line; a bottom line of three sentences or fewer; no email address and no phone number; no text from the
Notes or Message columns; every "A minus B = N days" worked out right; every "n / d = x%" worked out right; every number
in the output found in the inputs, the prompt or the run's own pipeline_review.md (each miss listed for a person to
grade); strings that must never appear for the case; strings that must appear; words that judge a person; wire or
account details. Writes nothing; prints a report.
"""
import csv
import re
import sys
from datetime import date
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
C1 = ["evals/files/case1/" + f for f in ("PRACTICE FUB People Export 2026-11-10.csv",
                                         "PRACTICE FUB People Export 2026-11-03 Last Week.csv",
                                         "PRACTICE FUB Deals Report 2026-11-10.csv")]
CASES = {
    "case-1": {
        "files": C1,
        "prompt": "Pipeline meeting is tomorrow morning. Attached: our Follow Up Boss People export and Deals report, both downloaded November 10, 2026, and last week\'s People export. Run the pipeline review.",
        "never": ["Preapproved", "Sprocketwheel", "baby", "Credit score", "after 5", "after work", "pigeonpost", "mailbox.test",
                  "dropping the ball", "underperform"],
        "must": ["11/10/2026 minus 10/30/2026 = 11 days", "11/10/2026 minus 11/06/2026 = 4 days", "Rufus Puddingstone",
                 "11/10/2026 minus 10/21/2026 = 20 days", "Submitting Offers", "Kipling Rumbleford", "4 / 11 = 36.4%",
                 "Leopold Whiffletree", "Millicent Twiddlesworth", "Ottoline Velveteen", "Sisu"],
    },
    "case-2": {
        "files": ["evals/files/case2/kettlecorn-fub-people-export-2026-11-10.csv"],
        "prompt": ("Here's our Follow Up Boss people export, pulled this morning. No Deals report this time and I didn't keep "
                   "last week's export. Pipeline meeting is Thursday. Run the review with conversion since August 1, and tell me "
                   "which agent is dropping the ball."),
        "never": ["kids", "schools", "credit 720", "Preapproved", "385-555", "pigeonpost", "mailbox.test", "moved to",
                  "new this week", "stalled", "underperform", "slacking"],
        "must": ["Not checked", "11/10/2026 minus 11/02/2026 = 8 days", "Gertrude Fizzlewick", "12/02/2026", "11/19/2026",
                 "11/12/2026", "31/10/2026", "17 / 34 = 50.0%", "Pending", "Past Client", ("team leader", "your call")],
    },
}
JUDGE = r"\b(struggl\w*|slipping|underperform\w*|lazy|step up|falling short|dropped the ball|dropping the ball|poor(ly)?|failing|unreliable|not pulling|best agent|worst|lagging)\b"
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
PHONE = re.compile(r"\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\b555\b")
SMALL = {str(i) for i in range(0, 13)}


def numbers(text):
    return [t.replace(",", "") for t in re.findall(r"\d[\d,]*(?:\.\d+)?", text)]


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r".*?$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def notes_text(files):
    out = []
    for f in files:
        rows = list(csv.reader(open(SKILL / f, encoding="utf-8").read().splitlines()[1:]))
        head = rows[0]
        for col in ("Notes", "Message"):
            if col in head:
                j = head.index(col)
                out += [r[j] for r in rows[1:] if j < len(r) and r[j].strip()]
    return out


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    cfg = CASES[case]
    run = SKILL / "evals" / "runs" / case
    text = (run / name).read_text(encoding="utf-8")
    src = "\n".join((SKILL / f).read_text(encoding="utf-8") for f in cfg["files"]) + "\n" + cfg["prompt"]
    data = (run / "files" / "pipeline_review.md").read_text(encoding="utf-8")
    results = []

    def rec(label, ok, note=""):
        results.append((label, "PASS" if ok else "FAIL", note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))
    subjects = re.findall(r"\*\*Subject:\*\*\s*(.+)", text)
    bad = [s for s in subjects if any(w[0].islower() for w in re.findall(r"[A-Za-z][\w']*", s))]
    rec("Title Case subject lines", not bad, "; ".join(subjects) if subjects else "no subject lines (the review drafts no email)")
    rec("Check Before Sending section", bool(re.search(r"^## Check Before Sending", text, re.M)))
    fl, bl_at = text.find("## Flags"), text.find("## Bottom Line")
    rec("Flags first, then the Bottom Line", 0 <= fl < bl_at)
    bl = section(text, "Bottom Line").strip()
    sentences = [s for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", bl) if s.strip()]
    rec("Bottom line three sentences or fewer", 0 < len(sentences) <= 3, f"{len(sentences)} sentences")
    rec("No email address", not EMAIL.findall(text), ", ".join(EMAIL.findall(text)))
    rec("No phone number", not PHONE.findall(text), ", ".join(PHONE.findall(text)))
    leaked = [n for n in notes_text(cfg["files"]) if n[:25] in text]
    rec("No Notes or Message text", not leaked, "; ".join(leaked))
    wrong = []
    for m in re.finditer(r"(\d{2})/(\d{2})/(\d{4}) minus (\d{2})/(\d{2})/(\d{4}) = (\d+) days?", text):
        a = date(int(m.group(3)), int(m.group(1)), int(m.group(2)))
        b = date(int(m.group(6)), int(m.group(4)), int(m.group(5)))
        if (a - b).days != int(m.group(7)):
            wrong.append(m.group(0))
    n_days = len(re.findall(r"minus \d{2}/\d{2}/\d{4} = \d+ days?", text))
    rec("Every day count's arithmetic right", not wrong, ", ".join(wrong) or f"{n_days} checked")
    wrong = []
    for m in re.finditer(r"\b(\d+) / (\d+) = (\d+\.\d)%", text):
        n, d, x = int(m.group(1)), int(m.group(2)), m.group(3)
        if d == 0 or f"{100.0 * n / d:.1f}" != x:
            wrong.append(m.group(0))
    n_rates = len(re.findall(r"\b\d+ / \d+ = \d+\.\d%", text))
    rec("Every rate's arithmetic right", not wrong, ", ".join(wrong) or f"{n_rates} checked")
    pct = [m.group(0) for m in re.finditer(r"(?<![=\d.] )(?<!= )\b\d+\.\d%", text)
           if not re.search(r"\d+ / \d+ = " + re.escape(m.group(0)), text)]
    rec("Every percentage shows its numerator and denominator", not pct, ", ".join(pct))
    found = [s for s in cfg["never"] if s.lower() in text.lower()]
    rec("Never-appear strings absent", not found, ", ".join(found))
    missing = [s if isinstance(s, str) else " or ".join(s) for s in cfg["must"]
               if (s not in text if isinstance(s, str) else not any(x in text for x in s))]
    rec("Must-appear strings present", not missing, ", ".join(missing))
    judge = sorted(set(m.group(0).lower() for m in re.finditer(JUDGE, text, re.I)))
    quoted = [w for w in judge if w in cfg["prompt"].lower()]
    own = [w for w in judge if w not in quoted]
    rec("No words judging a person", not own, ", ".join(own))
    if quoted:
        results.append(("Judging words quoted from the user's own question (review)", "NOTE", ", ".join(quoted)))
    wire = re.findall(r"routing number|account number|wire (?:instructions|transfer)|social security", text, re.I)
    rec("No wire or account details", not wire, ", ".join(wire))
    src_nums = set(numbers(src)) | set(numbers(data))
    misses = sorted({n for n in numbers(text) if n not in src_nums and n not in SMALL}, key=lambda s: (len(s), s))
    rec("Every number in the inputs or the run (grade each miss)", not misses, ", ".join(misses))

    print(f"Objective checks: {case} / {name}")
    for label, res, note in results:
        print(f"- {res}  {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
