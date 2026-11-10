"""Objective checks for agent-1on1-prep runs.

python3 -I skills/agent-1on1-prep/evals/make/objective_checks.py <case> [output.md]
  case: case-1 (the full practice set), case-2 (no goals, a health detail, a split question and a comparison)

Checks: no em or en dashes; Title Case subject lines; a Check Before Sending section; Flags before the Bottom Line; a
bottom line of three sentences or fewer; every "n / d = x%" right; every "A x m / 12 = P" right; every "A minus B = D"
and "(A minus B) / n months left = X a month" right; every "S / n = A a month" right; every number in the output found
in the inputs, the prompt or the run's one_on_one_data.md (each miss listed for a person to grade); strings that must
never appear for the case (left-out details, other agents); strings that must appear; words that judge the agent;
words that predict the agent's future; status words that mark a commitment; wire or account details. Writes nothing;
prints a report.
"""
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
C1 = ["evals/files/case1/" + f for f in ("PRACTICE Sisu Monthly Numbers Marigold Fizzwhistle 2026-11-10.csv",
                                         "PRACTICE Marigold Fizzwhistle 2026 Goals.md",
                                         "PRACTICE Last 1on1 Notes 2026-10-08.txt")]
C2 = ["evals/files/case2/" + f for f in ("kettleworth-team-tracker-2026.xlsx", "tamsin-1on1-notes-2026-10-14.txt",
                                         "bram-notes-for-tamsin-1on1.txt")]
P1 = ("Prep my one-on-one with Marigold Fizzwhistle, Thursday, November 12 at 10:00 AM, 30 minutes. Attached: her Sisu "
      "numbers (pulled November 10, 2026), her 2026 goals and my notes from our last one-on-one. My notes for this one: "
      "she texted me on 10/29 that she finished calling the Q3 buyers. I haven't seen the listing presentation draft yet. "
      "She says the 10/18 open house at 41 Snickerdoodle Ct brought in 3 buyer leads.")
P2 = ("1:1 with Tamsin tomorrow at 2:00 PM. Attached: our team tracker (pulled this morning, November 10, 2026), my notes "
      "from our October 14 one-on-one, and my notes for this one. We never put her goals in Sisu. Prep me.")
CASES = {
    "case-1": {
        "files": C1, "prompt": P1,
        "never": ["148,500", "148500", "kids", "cabin", "lake", "Take-home goal", "2028", "my why", "Dana"],
        "must": ["24 x 10 / 12 = 20.0", "20 / 20.0 = 100.0%", "33 / 40.0 = 82.5%", "85 / 100.0 = 85.0%",
                 "$221,035 / $225,000 = 98.2%", "33 / 72 = 45.8%", "80 / 9 = 8.9 a month", "No status given",
                 "The export shows 5 appointments set in October 2026", "Set at least 8 appointments in October.",
                 "Call or text the 14 buyers she met in Q3 who haven't signed, by October 31.",
                 "Send Cosmo a draft of her updated listing presentation before our next one-on-one.",
                 "11/10/2026", "November 2026", "10:00 AM to 10:30 AM", "[Update From Today]", "not a verdict"],
    },
    "case-2": {
        "files": C2, "prompt": P2,
        "never": ["Dana", "Pumpernickel", "Waffleby", "Marchpane", "Rupert", "Ottilie", "pulling her weight",
                  "pulling", "surgery", "back surgery", "December 3", "two weeks", "75/25", "70/30", "65/35",
                  "14 closings", "prorated", "of the prorated goal", "on pace", "Pace then", "Pace now"],
        "must": ["No goal", "no pace math", "Account > Performance > Goals", "73", "not totaled", "August",
                 "24 / 9 = 2.7 a month", "done, she showed me on 10/20", "She held one open house, on 10/17.",
                 "Host two open houses in October.", "No status given", "another agent", "broker",
                 "2:00 PM to 2:30 PM", "3 other agents", "[Update From Today]", "not a verdict"],
    },
}
JUDGE = (r"\b(underperform\w*|lazy|struggl\w*|slipping|falling behind|fell behind|behind on|not pulling|unmotivated|"
         r"weak|disappointing|step up|top performer|rock ?star|poor(ly)?|failing|failed|slacking|coasting|"
         r"needs to|should have)\b")
PREDICT = (r"\b(on pace to|on track to|will (?:finish|hit|miss|close|reach|end)|likely to|at this rate|projected|"
           r"projection|forecast\w*|expected to finish)\b")
STATUS = r"\b(missed|not done|partly done|partially|overdue|incomplete|late|completed|fell short)\b"


def src_text(files):
    out = []
    for f in files:
        p = SKILL / f
        if p.suffix == ".xlsx":
            import openpyxl
            wb = openpyxl.load_workbook(p, data_only=True)
            for ws in wb.worksheets:
                for row in ws.iter_rows(values_only=True):
                    out.append(" ".join("" if v is None else str(v) for v in row))
        else:
            out.append(p.read_text(encoding="utf-8"))
    return "\n".join(out)


def numbers(text):
    out = set()
    for t in re.findall(r"\d[\d,]*(?:\.\d+)?", text):
        try:
            out.add(round(float(t.replace(",", "")), 4))
        except ValueError:
            pass
    return out


def num(s):
    return float(s.replace("$", "").replace(",", ""))


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r".*?$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    cfg = CASES[case]
    run = SKILL / "evals" / "runs" / case
    text = (run / name).read_text(encoding="utf-8")
    data = (run / "files" / "one_on_one_data.md").read_text(encoding="utf-8")
    src = src_text(cfg["files"]) + "\n" + cfg["prompt"]
    results = []

    def rec(label, ok, note=""):
        results.append((label, "PASS" if ok else "FAIL", note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))
    subjects = re.findall(r"\*\*Subject:\*\*\s*(.+)", text)
    bad = [s for s in subjects if any(w[0].islower() for w in re.findall(r"[A-Za-z][\w']*", s))]
    rec("Title Case subject lines", subjects and not bad, "; ".join(subjects) if subjects else "no subject line")
    rec("Check Before Sending section", bool(re.search(r"^## Check Before Sending", text, re.M)))
    fl, bl = text.find("## Flags"), text.find("## Bottom Line")
    rec("Flags first, then the Bottom Line", 0 <= fl < bl)
    b = section(text, "Bottom Line").strip()
    sentences = [s for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", b) if s.strip()]
    rec("Bottom line three sentences or fewer", 0 < len(sentences) <= 3, f"{len(sentences)} sentences")

    M = r"\$?\d[\d,]*(?:\.\d+)?"
    wrong, n = [], 0
    for m in re.finditer(rf"({M}) / ({M}) = (\d+\.\d)%", text):
        n += 1
        d = num(m.group(2))
        if d == 0 or f"{100.0 * num(m.group(1)) / d:.1f}" != m.group(3):
            wrong.append(m.group(0))
    rec("Every n / d = x% right", not wrong, ", ".join(wrong) or f"{n} checked")
    wrong, n = [], 0
    for m in re.finditer(rf"({M}) x (\d+) / 12 = ({M})", text):
        n += 1
        if abs(num(m.group(1)) * int(m.group(2)) / 12 - num(m.group(3))) > 0.051:
            wrong.append(m.group(0))
    rec("Every prorated goal right", not wrong, ", ".join(wrong) or f"{n} checked")
    wrong, n = [], 0
    for m in re.finditer(rf"(?<!\()({M}) minus ({M}) = ({M})", text):
        n += 1
        if abs(num(m.group(1)) - num(m.group(2)) - num(m.group(3))) > 0.51:
            wrong.append(m.group(0))
    for m in re.finditer(rf"\(({M}) minus ({M})\) / (\d+) months? left = ({M}) a month", text):
        n += 1
        if abs((num(m.group(1)) - num(m.group(2))) / int(m.group(3)) - num(m.group(4))) > 0.51:
            wrong.append(m.group(0))
    rec("Every difference and per-month need right", not wrong, ", ".join(wrong) or f"{n} checked")
    wrong, n = [], 0
    for m in re.finditer(rf"({M}) / (\d+) = ({M}) a month", text):
        n += 1
        if abs(num(m.group(1)) / int(m.group(2)) - num(m.group(3))) > 0.51:
            wrong.append(m.group(0))
    rec("Every monthly average right", not wrong, ", ".join(wrong) or f"{n} checked")

    found = [s for s in cfg["never"] if s.lower() in text.lower()]
    rec("Never-appear strings absent", not found, ", ".join(found))
    missing = [s for s in cfg["must"] if s not in text]
    rec("Must-appear strings present", not missing, ", ".join(missing))
    judge = sorted(set(m.group(0).lower() for m in re.finditer(JUDGE, text, re.I)))
    rec("No words judging the agent", not judge, ", ".join(judge))
    pred = [m.group(0) for m in re.finditer(PREDICT, text, re.I)
            if not re.search(r"not a " + re.escape(m.group(0)), text[max(0, m.start() - 6):m.end()], re.I)]
    rec("No predictions about the agent", not pred, ", ".join(pred))
    commit = section(text, "Last Time's Commitments")
    st = sorted(set(m.group(0).lower() for m in re.finditer(STATUS, commit, re.I)))
    rec("No status word the inputs didn't give, in Commitments", not st, ", ".join(st))
    wire = re.findall(r"routing number|account number|wire (?:instructions|transfer)|social security", text, re.I)
    rec("No wire or account details", not wire, ", ".join(wire))
    have = numbers(src) | numbers(data)
    misses = sorted({t for t in re.findall(r"\d[\d,]*(?:\.\d+)?", text)
                     if round(float(t.replace(",", "")), 4) not in have and float(t.replace(",", "")) > 12},
                    key=lambda s: (len(s), s))
    rec("Every number in the inputs or the run (grade each miss)", not misses, ", ".join(misses))

    print(f"Objective checks: {case} / {name}")
    for label, res, note in results:
        print(f"- {res}  {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
