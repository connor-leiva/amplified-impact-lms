"""Objective checks for sphere-touch-plan runs.

python3 -I skills/sphere-touch-plan/evals/make/objective_checks.py <case-id> [output.md]

Checks: no em or en dashes; Title Case subjects; a Check Before Sending section; texts only to the people
the case allows, each 300 characters or fewer, naming the agent and ending "Reply STOP to opt out.";
every email with the opt-out and postal address footer and 120 words or fewer; no stock phrases in the
drafts; no website activity in the drafts; strings that must never appear (the left-out notes, deal
prices); and every number in the output found in the inputs, or in the list of numbers the run works
out (years since closing, counts, the share math), each miss listed for a person to grade. Writes
nothing; prints a report.
"""
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
FUB = "evals/files/eval-1-full-export/followupboss-people-export.csv"
SHEET = "evals/files/eval-2-no-consent-sheet/Sphere list - Sheet1.csv"
NEVER_FUB = ["hip surgery", "surgery", "refinanc", "divorce", "twins", "kindergarten", "layoff", "Medicare", "his mom", "daughter",
             "412,000", "412000", "389500", "389,500", "455000", "498000", "301000", "520000", "610000", "245000",
             "333000", "289000", "398000", "210000", "274000", "356000", "435000", "main-floor bedroom"]
NEVER_SHEET = ["retired", "retire", "health has been", "engaged", "engagement", "rough"]
CASES = {
    # case: (input files, the prompt's own words, people a text may go to, agent name in texts, never-appear strings)
    "practice": ([FUB], "Rowan Mockford Pretend Peak Realty 12-month",
                 {"Gwen", "Kit", "Lars", "Ned", "Ava", "Opal"}, "Rowan Mockford", NEVER_FUB),
    "eval-1-full-export": ([FUB], "Rowan Mockford Pretend Peak Realty October Hank Brindlecomb",
                           {"Gwen", "Kit", "Lars", "Ned", "Ava", "Opal", "Hank"}, "Rowan Mockford", NEVER_FUB),
    "eval-2-no-consent-sheet": ([SHEET], "", set(), None, NEVER_SHEET),
}
# Numbers the run works out rather than reads: years since closing, tier and pick counts, the share math,
# the 12 months of the plan and its touches a year, days and weeks left in the month, and the 8 to 8 window.
WORKED_OUT = {"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19",
              "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "34", "120", "300", "60", "90",
              "2026", "2027"}
STOCK = ["stunning", "dream home", "don't hesitate", "reach out", "touch base", "circle back", "just checking in",
         "finds you well", "perfect home"]
FOOTER = "To stop these emails, reply UNSUBSCRIBE"


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r".*?$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    text = (SKILL / "evals" / "runs" / case / name).read_text(encoding="utf-8")
    files, prompt, text_ok, agent, never = CASES[case]
    src = "\n".join((SKILL / f).read_text(encoding="utf-8") for f in files) + "\n" + prompt
    results = []

    def rec(label, ok, note=""):
        results.append((label, "PASS" if ok else "FAIL", note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))
    rec("Check Before Sending section", bool(re.search(r"^## Check Before Sending", text, re.M)))

    drafts = section(text, "Drafts")
    blocks = re.split(r"^### ", drafts, flags=re.M)[1:]
    texts, emails, calls = [], [], []
    for b in blocks:
        head = b.splitlines()[0]
        who = head.split(".", 1)[-1].strip().split(" ")[0]
        if head.rstrip().endswith("Text"):
            msg = " ".join(l[2:].strip() for l in b.splitlines() if l.startswith("> "))
            texts.append((who, msg))
        elif head.rstrip().endswith("Email"):
            emails.append((who, b))
        elif "Call Note" in head:
            calls.append((who, b))
    rec("Draft counts", True, f"{len(texts)} texts, {len(emails)} emails, {len(calls)} call notes")

    bad_to = [w for w, _ in texts if w not in text_ok]
    rec("Texts only to people with consent on file or given in chat", not bad_to, ", ".join(bad_to))
    long_t = [f"{w} ({len(m)})" for w, m in texts if len(m) > 300]
    rec("Texts 300 characters or fewer", not long_t, ", ".join(long_t) or (", ".join(f"{w} {len(m)}" for w, m in texts)))
    no_stop = [w for w, m in texts if not m.endswith("Reply STOP to opt out.")]
    rec("Every text ends with Reply STOP to opt out.", not no_stop, ", ".join(no_stop))
    if agent:
        no_name = [w for w, m in texts if agent not in m]
        rec("Every text names the agent", not no_name, ", ".join(no_name))

    subjects = re.findall(r"\*\*Subject:\*\*\s*(.+)", text)
    bad_subj = [s for s in subjects if any(w[0].islower() for w in re.findall(r"[A-Za-z][\w']*", s))]
    rec("Title Case subjects", subjects and not bad_subj, f"{len(subjects)} subjects" + (f"; lowercase in: {bad_subj}" if bad_subj else ""))
    no_footer = [w for w, b in emails if FOOTER not in b or "[Sender Postal Address]" not in b]
    rec("Every email has the opt-out and postal address footer", not no_footer, ", ".join(no_footer))
    counts = []
    for w, b in emails:
        body = b.split("**Subject:**", 1)[-1].split("\n", 1)[-1].split(FOOTER)[0]
        counts.append((w, len(re.findall(r"[A-Za-z0-9$'][\w$',.:!?]*", body))))
    rec("Email bodies 120 words or fewer (signature included)", all(c <= 120 for _, c in counts), ", ".join(f"{w} {c}" for w, c in counts))

    lowered = drafts.lower()
    rec("No stock phrases in the drafts", not [p for p in STOCK if p in lowered], ", ".join(p for p in STOCK if p in lowered))
    rec("No website activity in the drafts", not re.search(r"website|saw you|last activity|browsing", drafts, re.I))
    found = [s for s in never if s.lower() in text.lower()]
    rec("Never-appear strings absent", not found, ", ".join(found))
    wire = re.findall(r"routing|account number|wire|social security", text, re.I)
    rec("No wire or account details", not wire, ", ".join(wire))

    src_nums = set()
    for tok in re.findall(r"\d[\d,]*(?:\.\d+)?", src):
        n = tok.replace(",", "")
        src_nums.add(n)
        src_nums.add(n.lstrip("0") or "0")
    for d in re.findall(r"(\d{4})-(\d{2})-(\d{2})", src):  # a date's parts, as written out ("November 3")
        src_nums.update({d[0], str(int(d[1])), str(int(d[2]))})
    for d in re.findall(r"(\d{1,2})/(\d{1,2})/(\d{4})", src):
        src_nums.update({str(int(d[0])), str(int(d[1])), d[2]})
    misses = []
    for tok in re.findall(r"\d[\d,]*(?:\.\d+)?", re.sub(r"\[[^\]]*\]", " ", text)):
        n = tok.replace(",", "").rstrip(".")
        if n in src_nums or n.lstrip("0") in src_nums or n in WORKED_OUT:
            continue
        misses.append(tok)
    rec("Numbers not found in the inputs or the worked-out list (grade each)", not misses, ", ".join(sorted(set(misses))))

    print(f"Objective checks: {case} / {name}")
    for label, res, note in results:
        print(f"- {res}  {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
